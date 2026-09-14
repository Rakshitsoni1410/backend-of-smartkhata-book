
import connection from "../config/mongodb.js";

import CustomerOrder from "../models/CustomerOrder.js";
import Bill from "../models/Bill.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js" // adjust if your Product model filename is different

export const getDashboard = async (req, res) => {
    try {
        const customerId = req.user._id;
        const [totalOrders, pendingOrders, totalBills, unpaidBills] = await Promise.all([
            CustomerOrder.countDocuments({ customerId }),
            CustomerOrder.countDocuments({ customerId, status: "pending" }),
            Bill.countDocuments({ customerId }),
            Bill.find({ customerId, paymentStatus: { $ne: "paid" } }).select("amountDue totalAmount amountPaid"),
        ]);
        const amountDue = unpaidBills.reduce(
            (sum, b) => sum + (b.amountDue ?? b.totalAmount - (b.amountPaid || 0)), 0
        );
        res.json({ totalOrders, pendingOrders, totalBills, amountDue });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMyRetailers = async (req, res) => {
    try {
        const customerId = req.user._id;
        const retailers = await User.find({ role: "Retailer", customers: customerId })
            .select("name email phone shopName");
        if (!retailers.length) {
            const ids = await CustomerOrder.distinct("retailerId", { customerId });
            const fromOrders = await User.find({ _id: { $in: ids } })
                .select("name email phone shopName");
            return res.json({ retailers: fromOrders });
        }
        res.json({ retailers });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getRetailerProducts = async (req, res) => {
    try {
        const { retailerId } = req.params;
        if (req.user.role !== "Customer")
            return res.status(403).json({ message: "Only customers can view retailer products" });
        const products = await Product.find({
            ownerId: retailerId,
        }).select("name selling category stockQty unit description");
        res.json({ products });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const placeOrder = async (req, res) => {
    try {
        const customerId = req.user._id;
        const { retailerId, items, note } = req.body;
        if (req.user.role !== "Customer")
            return res.status(403).json({ message: "Only customers can place orders" });
        if (!retailerId || !Array.isArray(items) || !items.length)
            return res.status(400).json({ message: "retailerId and items are required" });
        const [retailer, customer] = await Promise.all([
            User.findOne({ _id: retailerId, role: "Retailer" }).select("name"),
            User.findById(customerId).select("name"),
        ]);
        if (!retailer || !customer)
            return res.status(404).json({ message: "Retailer or customer not found" });
        const productIds = items.map((item) => item.productId);
        if (productIds.some((id) => !id))
            return res.status(400).json({ message: "Each item must include a productId" });
        const products = await Product.find({ _id: { $in: productIds }, ownerId: retailerId });
        if (products.length !== new Set(productIds.map(String)).size)
            return res.status(400).json({ message: "One or more products are invalid" });
        const productById = new Map(products.map((product) => [String(product._id), product]));
        const orderItems = items.map((item) => {
            const product = productById.get(String(item.productId));
            const quantity = Number(item.quantity);
            if (!Number.isInteger(quantity) || quantity <= 0 || quantity > product.stockQty) {
                throw new Error("Invalid product quantity");
            }
            return { productId: product._id, name: product.name, price: product.selling, quantity };
        });
        const calculatedTotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const order = await CustomerOrder.create({
            customerId, retailerId,
            retailerName: retailer?.name,
            customerName: customer?.name,
            items: orderItems, totalAmount: calculatedTotal, note,
        });
        res.status(201).json({ message: "Order placed successfully", order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMyOrders = async (req, res) => {
    try {
        const customerId = req.user._id;
        const { limit, status } = req.query;
        const filter = { customerId };
        if (status) filter.status = status;
        const query = CustomerOrder.find(filter).sort({ createdAt: -1 });
        if (limit) query.limit(parseInt(limit));
        const orders = await query;
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMyBills = async (req, res) => {
    try {
        const customerId = req.user._id;
        const { paymentStatus } = req.query;
        const filter = { customerId };
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        const bills = await Bill.find(filter).sort({ createdAt: -1 });
        res.json({ bills });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createBill = async (req, res) => {
    try {
        const retailerId = req.user._id;
        if (req.user.role !== "Retailer")
            return res.status(403).json({ message: "Only retailers can create bills" });
        const {
            customerId, items, subtotal, tax, taxRate,
            discount, totalAmount, amountPaid, dueDate, note,
        } = req.body;
        if (!customerId || !Array.isArray(items) || !items.length)
            return res.status(400).json({ message: "customerId and items are required" });
        const [retailer, customer] = await Promise.all([
            User.findById(retailerId).select("name"),
            User.findById(customerId).select("name"),
        ]);
        if (!customer || customer.role !== "Customer")
            return res.status(404).json({ message: "Customer not found" });
        const cleanItems = items.map((item) => {
            const price = Number(item.price);
            const quantity = Number(item.quantity);
            if (!item.name || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity <= 0) {
                throw new Error("Invalid bill item");
            }
            return { name: String(item.name).trim(), price, quantity };
        });
        const subtotalValue = cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const taxRateValue = Number(taxRate || 0);
        const discountValue = Number(discount || 0);
        const amountPaidValue = Number(amountPaid || 0);
        if (!Number.isFinite(taxRateValue) || taxRateValue < 0 || taxRateValue > 100 ||
            !Number.isFinite(discountValue) || discountValue < 0 ||
            !Number.isFinite(amountPaidValue) || amountPaidValue < 0) {
            return res.status(400).json({ message: "Invalid bill amounts" });
        }
        const taxValue = subtotalValue * taxRateValue / 100;
        const calculatedTotal = Math.max(0, subtotalValue + taxValue - discountValue);
        if (amountPaidValue > calculatedTotal)
            return res.status(400).json({ message: "Amount paid cannot exceed total amount" });
        const bill = await Bill.create({
            retailerId, customerId,
            retailerName: retailer?.name,
            customerName: customer?.name,
            items: cleanItems,
            subtotal: subtotalValue,
            tax: taxValue,
            taxRate: taxRateValue,
            discount: discountValue,
            totalAmount: calculatedTotal,
            amountPaid: amountPaidValue,
            dueDate, note,
        });
        res.status(201).json({ message: "Bill created", bill });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getSentBills = async (req, res) => {
    try {
        if (req.user.role !== "Retailer")
            return res.status(403).json({ message: "Access denied" });
        const bills = await Bill.find({ retailerId: req.user._id }).sort({ createdAt: -1 });
        res.json({ bills });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        if (req.user.role !== "Retailer")
            return res.status(403).json({ message: "Access denied" });
        const { status } = req.body;
        const order = await CustomerOrder.findOneAndUpdate(
            { _id: req.params.id, retailerId: req.user._id },
            { status },
            { new: true }
        );
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.json({ message: "Status updated", order });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getIncomingOrders = async (req, res) => {
    try {
        if (req.user.role !== "Retailer")
            return res.status(403).json({ message: "Access denied" });
        const { status } = req.query;
        const filter = { retailerId: req.user._id };
        if (status) filter.status = status;
        const orders = await CustomerOrder.find(filter).sort({ createdAt: -1 });
        res.json({ orders });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};