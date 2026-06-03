
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
        const retailers = await User.find({ role: "retailer", customers: customerId })
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
        const products = await Product.find({
            $or: [
                { userId: retailerId },
                { owner: retailerId },
                { createdBy: retailerId },
            ],
        }).select("name price category quantity unit description");
        res.json({ products });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const placeOrder = async (req, res) => {
    try {
        const customerId = req.user._id;
        const { retailerId, items, totalAmount, note } = req.body;
        if (!retailerId || !items?.length)
            return res.status(400).json({ message: "retailerId and items are required" });
        const [retailer, customer] = await Promise.all([
            User.findById(retailerId).select("name"),
            User.findById(customerId).select("name"),
        ]);
        const order = await CustomerOrder.create({
            customerId, retailerId,
            retailerName: retailer?.name,
            customerName: customer?.name,
            items, totalAmount, note,
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
        if (req.user.role !== "retailer")
            return res.status(403).json({ message: "Only retailers can create bills" });
        const {
            customerId, items, subtotal, tax, taxRate,
            discount, totalAmount, amountPaid, dueDate, note,
        } = req.body;
        if (!customerId || !totalAmount)
            return res.status(400).json({ message: "customerId and totalAmount are required" });
        const [retailer, customer] = await Promise.all([
            User.findById(retailerId).select("name"),
            User.findById(customerId).select("name"),
        ]);
        const bill = await Bill.create({
            retailerId, customerId,
            retailerName: retailer?.name,
            customerName: customer?.name,
            items: items || [],
            subtotal: subtotal || totalAmount,
            tax: tax || 0,
            taxRate: taxRate || 0,
            discount: discount || 0,
            totalAmount,
            amountPaid: amountPaid || 0,
            dueDate, note,
        });
        res.status(201).json({ message: "Bill created", bill });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getSentBills = async (req, res) => {
    try {
        if (req.user.role !== "retailer")
            return res.status(403).json({ message: "Access denied" });
        const bills = await Bill.find({ retailerId: req.user._id }).sort({ createdAt: -1 });
        res.json({ bills });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        if (req.user.role !== "retailer")
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
        if (req.user.role !== "retailer")
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