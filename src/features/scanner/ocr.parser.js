export function parseOcrResult(textLines) {
  const result = {
    quantity: null,
    expiration_date: null
  };

  const text = textLines.join(' ').toLowerCase();

  const qtyMatch = text.match(/(?:qty|quantity|amount|total)\s*[:\-]?\s*(\d+)/i);
  if (qtyMatch) {
    result.quantity = qtyMatch[1];
  } else {
    const fallbackQty = text.match(/(?<!\d)(?!202\d)\d+(?!\d)/);
    if (fallbackQty) {
        result.quantity = fallbackQty[0];
    }
  }

  const dateMatch = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
  if (dateMatch) {
    let dateStr = dateMatch[0];
    
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts[2].length === 4) {
            if (parts[0].length === 2 && parts[2].length === 4) {
                result.expiration_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        } else if (parts[0].length === 4) {
             result.expiration_date = `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) {
            result.expiration_date = dateStr;
        } else if (parts[2].length === 4) {
            result.expiration_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
  }

  return result;
}