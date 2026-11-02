import { supabase } from '../../core/supabase.js';
import { getExpirationStatus } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS, RECORD_STATUS } from '../../shared/constants/app.constants.js';

export async function fetchAdvisorData() {
  try {
    // 1. Fetch only ACTIVE commodities with their batches and unit
    const { data: rawCommodities, error: commError } = await supabase
      .from('commodities')
      .select(`
        id, 
        name, 
        category,
        unit,
        deleted_at,
        batches (
          id,
          batch_number,
          quantity,
          expiration_date,
          deleted_at,
          record_status
        )
      `)
      .is('deleted_at', null)
      .order('name');
      
    if (commError) throw commError;

    const commodities = (rawCommodities || []).filter(c => !c.deleted_at);

    // 2. Fetch upcoming events (next 30 days, active only)
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    
    const { data: rawEvents, error: eventError } = await supabase
      .from('calendar_events')
      .select('*')
      .is('deleted_at', null)
      .gte('start_date', today.toISOString().split('T')[0])
      .lte('start_date', nextMonth.toISOString().split('T')[0])
      .order('start_date');

    if (eventError) throw eventError;

    const events = (rawEvents || []).filter(e => !e.deleted_at);

    // Aggregations
    let totalActiveItems = commodities.length;
    let lowStockCount = 0;
    let criticalExpiringCount = 0;
    let warningExpiringCount = 0;
    let totalBatches = 0;
    
    let healthData = [];
    let expiringSoon = [];
    let suggestedActions = [];
    let expiredBatches = [];
    let nearExpiryBatches = [];
    let lowStockCommodities = [];

    // Analyze each active commodity
    commodities.forEach(c => {
      let activeBatches = (c.batches || []).filter(b => 
        b.deleted_at === null && 
        b.record_status === RECORD_STATUS.ACTIVE && 
        (b.quantity || 0) > 0
      );
      let totalQty = activeBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
      totalBatches += activeBatches.length;
      const unit = c.unit || 'Units';
      
      if (totalQty === 0) {
        lowStockCount++;
        lowStockCommodities.push({
          id: c.id,
          name: c.name,
          category: c.category || 'General',
          totalQty: 0,
          unit,
          status: 'Out of Stock'
        });
        suggestedActions.push({ type: 'warning', title: `Restock Required`, desc: `${c.name} has 0 available ${unit} in stock.` });
      } else if (totalQty < 50) {
        lowStockCount++;
        lowStockCommodities.push({
          id: c.id,
          name: c.name,
          category: c.category || 'General',
          totalQty,
          unit,
          status: 'Low Stock (< 50)'
        });
      }

      let criticalQty = 0;
      let warningQty = 0;
      
      activeBatches.forEach(b => {
        if (!b.expiration_date) return;
        const status = getExpirationStatus(b.expiration_date);
        if (status === EXPIRATION_STATUS.EXPIRED) {
          criticalQty += (b.quantity || 0);
        } else if (status === EXPIRATION_STATUS.NEAR_EXPIRY) {
          warningQty += (b.quantity || 0);
        }
      });

      healthData.push({ 
        id: c.id,
        name: c.name, 
        unit,
        activeBatches: activeBatches.length,
        totalQty,
        criticalQty,
        warningQty
      });

      // Check expirations on active batches with stock
      activeBatches.forEach(b => {
        if (!b.expiration_date) return;
        const status = getExpirationStatus(b.expiration_date);
        
        if (status === EXPIRATION_STATUS.EXPIRED) {
          criticalExpiringCount++;
          expiredBatches.push({
            id: b.id,
            commodityId: c.id,
            commodityName: c.name,
            batchNumber: b.batch_number,
            quantity: b.quantity || 0,
            unit,
            expirationDate: b.expiration_date,
            status: status
          });
          suggestedActions.push({ type: 'error', title: `Archive Expired Batch`, desc: `${c.name} (${b.batch_number})` });
        } else if (status === EXPIRATION_STATUS.NEAR_EXPIRY) {
          warningExpiringCount++;
          nearExpiryBatches.push({
            id: b.id,
            commodityId: c.id,
            commodityName: c.name,
            batchNumber: b.batch_number,
            quantity: b.quantity || 0,
            unit,
            expirationDate: b.expiration_date,
            status: status
          });
          suggestedActions.push({ type: 'warning', title: `Flag for Priority Release`, desc: `${c.name} (${b.batch_number})` });
        }

        if (status === EXPIRATION_STATUS.EXPIRED || status === EXPIRATION_STATUS.NEAR_EXPIRY) {
          expiringSoon.push({
            id: b.id,
            name: c.name,
            unit,
            batch: b.batch_number,
            quantity: b.quantity || 0,
            date: b.expiration_date,
            status: status
          });
        }
      });
    });

    // Check Events
    const upcomingEvents = (events || []).map(e => ({
      id: e.id,
      title: e.title,
      startDate: e.start_date,
      endDate: e.end_date,
      location: e.location || 'Municipal Center'
    }));

    (events || []).forEach(e => {
      suggestedActions.push({ type: 'info', title: `Prepare stock for Event`, desc: `${e.title} (${e.start_date})` });
    });

    // Sort expiring soon by earliest date
    expiringSoon.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Deduplicate actions (simple slice to top 5)
    suggestedActions = suggestedActions.slice(0, 5);

    return {
      success: true,
      data: {
        totalActiveItems,
        totalBatches,
        lowStockCount,
        criticalExpiringCount, // Strictly EXPIRED batches (< 0 days)
        warningExpiringCount,  // Strictly NEAR_EXPIRY batches (0 - 90 days)
        healthData,
        expiringSoon,
        events: events || [],
        suggestedActions,
        drilldown: {
          expired: expiredBatches,
          nearExpiry: nearExpiryBatches,
          lowStock: lowStockCommodities,
          events: upcomingEvents
        }
      }
    };
  } catch (error) {
    console.error('Error fetching advisor data:', error);
    return { success: false, error: error.message };
  }
}

export function generateAdvisorSummary(data) {
  const { totalBatches, criticalExpiringCount, warningExpiringCount, lowStockCount, events } = data;
  const eventCount = events ? events.length : 0;
  
  let actionParts = [];
  if (criticalExpiringCount > 0) actionParts.push(`${criticalExpiringCount} expired batch(es)`);
  if (warningExpiringCount > 0) actionParts.push(`${warningExpiringCount} nearing expiry`);
  if (lowStockCount > 0) actionParts.push(`${lowStockCount} low-stock alert(s)`);
  
  let eventText = eventCount > 0 
    ? `Operations timeline indicates ${eventCount} scheduled program event(s) in next 30 days.`
    : `No program events scheduled for the next 7 days.`;

  if (actionParts.length > 0) {
    let actionString = actionParts.length > 1 
      ? actionParts.slice(0, -1).join(', ') + ' and ' + actionParts[actionParts.length - 1]
      : actionParts[0];
    return `Currently managing ${totalBatches} active commodity batches. Action required: ${actionString}. ${eventText}`;
  } else {
    return `Currently managing ${totalBatches} active commodity batches. All inventory is within optimal expiration thresholds. ${eventText}`;
  }
}
