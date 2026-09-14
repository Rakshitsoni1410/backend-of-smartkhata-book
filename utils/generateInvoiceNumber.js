import Counter from "../models/Counter.js";

// Turns "AR Bros" into "ARBROS", strips anything that isn't A-Z or 0-9,
// and caps it at 6 characters so invoice numbers stay short and readable.
function slugify(name = "") {
    const cleaned = name.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned.slice(0, 6) || "SHOP";
}

// DD-MM-YYYY (Indian date format) from the order's own date — NOT today's
// date — so an invoice generated later for an older order still reflects
// when the order happened.
function formatDate(date) {
    const d = date ? new Date(date) : new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Builds an invoice number like "ARBROS-20260914-0001".
 *
 * The sequence resets per wholesaler, per day — each wholesaler's counter
 * key is unique to that shop + that date, so their first bill of the day
 * is always 0001, the next is 0002, and so on. A different wholesaler (or
 * the same wholesaler on a different day) gets its own independent count.
 *
 * @param {string} wholesalerName - e.g. shopName or name of the wholesaler
 * @param {Date|string} orderDate - the order's createdAt, not "now"
 */
export async function getNextInvoiceNumber(wholesalerName, orderDate) {
    const datePart = formatDate(orderDate);
    const namePart = slugify(wholesalerName);
    const counterKey = `${namePart}-${datePart}`;

    const counter = await Counter.findOneAndUpdate(
        { name: counterKey },
        { $inc: { value: 1 } },
        { new: true, upsert: true }
    );

    return `${namePart}-${datePart}-${String(counter.value).padStart(4, "0")}`;
}