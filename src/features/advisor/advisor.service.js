import { supabase } from '../../core/supabase.js';
import { getExpirationStatus } from '../../shared/utils/date.utils.js';
import { EXPIRATION_STATUS, RECORD_STATUS } from '../../shared/constants/app.constants.js';

export async function fetchAdvisorData() {
  try {
    // 1. Fetch only ACTIVE commodities with their batches
    const { data: rawCommodities, error: commError } = await supabase
      .from('commodities')
      .select(`
        id, 
        name, 
        category,
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

    // 2. Fetch upcoming events (next 30 days)
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    
    const { data: events, error: eventError } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_date', today.toISOString().split('T')[0])
      .lte('start_date', nextMonth.toISOString().split('T')[0])
      .order('start_date');

    if (eventError) throw eventError;

    // Aggregation
    let totalActiveItems = commodities.length;
    let lowStockCount = 0;
    let criticalExpiringCount = 0;
    let warningExpiringCount = 0;
    let totalBatches = 0;
    
    let healthData = [];
    let expiringSoon = [];
    let suggestedActions = [];

    // Analyze each active commodity
    commodities.forEach(c => {
      let activeBatches = (c.batches || []).filter(b => 
        b.deleted_at === null && 
        b.record_status === RECORD_STATUS.ACTIVE && 
        (b.quantity || 0) > 0
      );
      let totalQty = activeBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
      totalBatches += activeBatches.length;
      
      if (totalQty === 0) {
        lowStockCount++;
        suggestedActions.push({ type: 'warning', title: `Restock Required`, desc: `${c.name} has 0 available units in stock.` });
      } else if (totalQty < 50) {
        lowStockCount++;
      }

      let criticalQty = 0;
      let warningQty = 0;
      
      activeBatches.forEach(b => {
        if (!b.expiration_date) return;
        const status = getExpirationStatus(b.expiration_date);
        if (status === EXPIRATION_STATUS.EXPIRED) criticalQty += (b.quantity || 0);
        else if (status === EXPIRATION_STATUS.NEAR_EXPIRY) warningQty += (b.quantity || 0);
      });

      healthData.push({ 
        name: c.name, 
        activeBatches: activeBatches.length,
        totalQty,
        criticalQty,
        warningQty
      });

      // Check expirations on active batches with stock
      activeBatches.forEach(b => {
        if (!b.expiration_date) return;
        const status = getExpirationStatus(b.expiration_date);
        if (status === EXPIRATION_STATUS.EXPIRED || status === EXPIRATION_STATUS.NEAR_EXPIRY) {
          criticalExpiringCount++;
          expiringSoon.push({
            name: c.name,
            batch: b.batch_number,
            date: b.expiration_date,
            status: status
          });
          
          if (status === EXPIRATION_STATUS.EXPIRED) {
             suggestedActions.push({ type: 'error', title: `Archive Expired Batch`, desc: `${c.name} (${b.batch_number})` });
          } else {
             warningExpiringCount++;
             suggestedActions.push({ type: 'warning', title: `Flag for Priority Release`, desc: `${c.name} (${b.batch_number})` });
          }
        }
      });
    });

    // Check Events
    (events || []).forEach(e => {
      suggestedActions.push({ type: 'info', title: `Prepare stock for Event`, desc: `${e.title} (${e.start_date})` });
    });

    // Sort expiring soon
    expiringSoon.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Deduplicate actions (simple slice to top 5)
    suggestedActions = suggestedActions.slice(0, 5);

    return {
      success: true,
      data: {
        totalActiveItems,
        totalBatches,
        lowStockCount,
        criticalExpiringCount,
        warningExpiringCount,
        healthData,
        expiringSoon,
        events: events || [],
        suggestedActions
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
  if (criticalExpiringCount > 0) actionParts.push(`${criticalExpiringCount} critical expiration(s)`);
  if (warningExpiringCount > 0) actionParts.push(`${warningExpiringCount} nearing expiry`);
  if (lowStockCount > 0) actionParts.push(`${lowStockCount} commodity low stock alert(s)`);
  
  let eventText = eventCount > 0 
    ? `Operations timeline indicates ${eventCount} scheduled program event(s) this week.`
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
