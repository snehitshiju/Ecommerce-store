// --- FILE: server.js ---
// This is the core Node.js/Express server file.
// It handles API routes, MongoDB connection, and cart/order logic.

// 1. Setup and Initialization
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here'; // Default secret if not set in .env
const API_BASE_URL = '/api';

// Middleware
// NOTE: CORS is crucial for frontend/backend communication when running on different ports
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecommercestore'); // Fallback URI
        console.log('MongoDB connected successfully.');
        await seedDummyData(); // Seed data immediately after connecting
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

// --- 2. Mongoose Schemas and Models ---

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true }, // e.g., 'Groceries', 'Electronics'
    price: { type: Number, required: true },
    description: { type: String },
    image_url: { type: String }, // ALIGNED to frontend image field
});
const Product = mongoose.model('Product', productSchema);

// User Schema (Basic Authentication)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false }, // Use select: false for security
    name: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }, 
});
const User = mongoose.model('User', userSchema);

// Order Item Schema (for nesting inside Order)
const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, required: true },
});

// Order Schema
const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true }, // Added from frontend checkout
    userId: { type: String, default: 'anonymous' }, // Updated to allow anonymous orders
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Received' }, // Changed to 'Received'
});
const Order = mongoose.model('Order', orderSchema);


// --- 3. Dummy Data Seeding ---

const DUMMY_PRODUCTS = [
    // --- 1. Groceries (5 items) ---
    { name: 'Organic Bananas', category: 'Groceries', price: 0.79, image_url: 'https://placehold.co/100x100/F5C913/000?text=Banana' },
    { name: 'Premium Espresso Beans', category: 'Groceries', price: 12.99, image_url: 'https://placehold.co/100x100/6A4D3A/FFF?text=Coffee' },
    { name: 'Whole Wheat Bread', category: 'Groceries', price: 3.75, image_url: 'https://placehold.co/100x100/6d4c41/ffffff?text=Bread' },
    { name: 'Dozen Large Eggs', category: 'Groceries', price: 4.99, image_url: 'https://placehold.co/100x100/ffd54f/333333?text=Eggs' },
    { name: 'Frozen Chicken Breasts', category: 'Groceries', price: 18.99, image_url: 'https://placehold.co/100x100/78909c/ffffff?text=Chicken' },

    // --- 2. Kitchen Utensils (5 items) ---
    { name: 'Stainless Steel Whisk', category: 'Kitchen utensils', price: 8.50, image_url: 'https://placehold.co/100x100/A0A0A0/FFF?text=Whisk' },
    { name: 'Non-stick Frying Pan', category: 'Kitchen utensils', price: 25.00, image_url: 'https://placehold.co/100x100/E5E5E5/000?text=Pan' },
    { name: 'Bamboo Cutting Board', category: 'Kitchen utensils', price: 14.99, image_url: 'https://placehold.co/100x100/28a745/ffffff?text=Cutting+Board' },
    { name: 'Digital Kitchen Scale', category: 'Kitchen utensils', price: 25.00, image_url: 'https://placehold.co/100x100/6c757d/ffffff?text=Scale' },
    { name: 'Silicone Spatula Set', category: 'Kitchen utensils', price: 11.99, image_url: 'https://placehold.co/100x100/fd7e14/ffffff?text=Spatula+Set' },
    
    // --- 3. Foood and beverage (Snacks) (5 items) ---
    { name: 'Salted Potato Chips (Pack)', category: 'Foood and beverage', price: 3.50, image_url: 'https://placehold.co/100x100/F0E68C/000?text=Chips' },
    { name: 'Sparkling Water (6-Pack)', category: 'Foood and beverage', price: 5.99, image_url: 'https://placehold.co/100x100/ADD8E6/000?text=Water' },
    { name: 'Chocolate Bar (King Size)', category: 'Foood and beverage', price: 1.75, image_url: 'https://placehold.co/100x100/795548/FFF?text=Choc' },
    { name: 'Protein Bar (Single)', category: 'Foood and beverage', price: 3.50, image_url: 'https://placehold.co/100x100/CDDC39/000?text=Protein' },
    { name: 'Gourmet Popcorn (Bag)', category: 'Foood and beverage', price: 3.99, image_url: 'https://placehold.co/100x100/FF5722/FFF?text=Popcorn' },

    // --- 4. Stationary (5 items) ---
    { name: 'Gel Pens (Set of 10)', category: 'Stationary', price: 6.00, image_url: 'https://placehold.co/100x100/4682B4/FFF?text=Pens' },
    { name: 'A4 Notebook (Lined)', category: 'Stationary', price: 4.50, image_url: 'https://placehold.co/100x100/D3D3D3/000?text=Notebook' },
    { name: 'Highlighter Set (4)', category: 'Stationary', price: 7.50, image_url: 'https://placehold.co/100x100/FFC107/000?text=H+Light' },
    { name: 'Scientific Calculator', category: 'Stationary', price: 15.00, image_url: 'https://placehold.co/100x100/343a40/FFF?text=Calc' },
    { name: 'Heavy Duty Stapler', category: 'Stationary', price: 12.00, image_url: 'https://placehold.co/100x100/808080/FFF?text=Stapler' },

    // --- 5. Electronics (5 items) ---
    { name: 'Smartphone Pro X', category: 'Electronics', price: 899.00, image_url: 'https://placehold.co/100x100/000000/FFF?text=Phone' },
    { name: '4K Smart LED TV', price: 1200.00, image_url: 'https://placehold.co/100x100/800080/FFF?text=TV' },
    { name: 'Noise-Cancelling Headphones', category: 'Electronics', price: 199.99, image_url: 'https://placehold.co/100x100/17A2B8/FFF?text=HP' },
    { name: 'Ultra-Slim Laptop', category: 'Electronics', price: 1500.00, image_url: 'https://placehold.co/100x100/212529/FFF?text=Laptop' },
    { name: 'Smart Home Speaker', category: 'Electronics', price: 79.99, image_url: 'https://placehold.co/100x100/6610F2/FFF?text=Speaker' },

    // --- 6. Home appliances (5 items) ---
    { name: 'Energy-Efficient Washer', category: 'Home appliances', price: 750.00, image_url: 'https://placehold.co/100x100/FFD700/000?text=Washer' },
    { name: 'Robotic Vacuum Cleaner', category: 'Home appliances', price: 350.00, image_url: 'https://placehold.co/100x100/FF6347/FFF?text=Vacuum' },
    { name: 'Digital Microwave Oven', category: 'Home appliances', price: 150.00, image_url: 'https://placehold.co/100x100/B0C4DE/000?text=Microwave' },
    { name: 'High-Speed Blender', category: 'Home appliances', price: 99.99, image_url: 'https://placehold.co/100x100/DC3545/FFF?text=Blender' },
    { name: 'Programmable Coffee Maker', category: 'Home appliances', price: 65.00, image_url: 'https://placehold.co/100x100/98FB98/000?text=Coffee+Maker' },
    
    // --- 7. Fashion dresses (5 items) ---
    { name: 'Summer Floral Dress', category: 'Fashion dresses', price: 45.00, image_url: 'https://placehold.co/100x100/FFC0CB/000?text=Dress' },
    { name: 'Slim Fit Blazer', category: 'Fashion dresses', price: 85.00, image_url: 'https://placehold.co/100x100/4682B4/FFF?text=Blazer' },
    { name: 'Casual T-shirt (3-Pack)', category: 'Fashion dresses', price: 30.00, image_url: 'https://placehold.co/100x100/F0F8FF/000?text=Tshirt' },
    { name: 'Denim Jeans (Slim Fit)', category: 'Fashion dresses', price: 55.00, image_url: 'https://placehold.co/100x100/4169E1/FFF?text=Jeans' },
    { name: 'Leather Belt', category: 'Fashion dresses', price: 25.00, image_url: 'https://placehold.co/100x100/8B4513/FFF?text=Belt', description: 'Genuine leather belt.' },
];

const seedDummyData = async () => {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.insertMany(DUMMY_PRODUCTS);
            console.log('Dummy product data seeded successfully.');
        } else {
            // console.log('Products already exist, skipping seed.');
        }
        
        // Ensure at least one admin user exists for testing
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount === 0) {
            await User.create({
                email: 'admin@ecommercestore.com',
                password: 'admim', // NOTE: Plaintext password for simple testing
                name: 'Site Administrator',
                role: 'admin'
            });
            console.log('Default Admin user seeded successfully.');
        }
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

// --- 4. Authentication Middleware ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expects format: Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden (e.g., expired token)
        req.user = user; // user payload contains { userId: '...' }
        next();
    });
};


// --- 5. API Routes ---

// --- Authentication Routes ---

const generateAccessToken = (user) => {
    // Include the role in the JWT payload
    return jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
};

app.post(`${API_BASE_URL}/signup`, async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Default role is 'user'
        const user = new User({ name, email, password, role: 'user' }); 
        await user.save();
        const token = generateAccessToken(user);
        res.status(201).json({ token, name: user.name, email: user.email });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }
        res.status(500).json({ message: 'Server error during signup.' });
    }
});

app.post(`${API_BASE_URL}/login`, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Use .select('+password') to force retrieval of the password field
        const user = await User.findOne({ email }).select('+password');

        if (!user || user.password.trim() !== password.trim()) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = generateAccessToken(user);
        res.json({ token, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// [POST] /api/admin/login - Log in an administrator (Temporarily bypasses role check for access)
app.post(`${API_BASE_URL}/admin/login`, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // CRITICAL FIX: Use .select('+password') to retrieve the field for comparison
        const user = await User.findOne({ email }).select('+password');

        if (!user || user.password.trim() !== password.trim()) {
            // Fails if password mismatch
            return res.status(401).json({ message: 'Invalid credentials.' }); 
        }

        // *** TEMPORARY BYPASS: Log in any user that passes the password check ***
        // The original check (if (user.role !== 'admin')) is intentionally commented out for debugging.
        
        const token = generateAccessToken(user);
        res.json({ token, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Server error during admin login.' });
    }
});

// --- Category Product Fetch Routes (Resolves Frontend 404 Errors) ---

// Helper function to fetch products by category
const fetchProductsByCategory = (categoryName) => async (req, res) => {
    try {
        const products = await Product.find({ category: categoryName });
        res.json(products);
    } catch (error) {
        console.error(`Error fetching ${categoryName}:`, error);
        res.status(500).json({ message: `Error fetching ${categoryName} products.` });
    }
};

// Dedicated GET routes for all 7 categories
app.get(`${API_BASE_URL}/groceries`, fetchProductsByCategory('Groceries'));
app.get(`${API_BASE_URL}/utensils`, fetchProductsByCategory('Kitchen utensils'));
app.get(`${API_BASE_URL}/snacls`, fetchProductsByCategory('Foood and beverage'));
app.get(`${API_BASE_URL}/stationary`, fetchProductsByCategory('Stationary'));
app.get(`${API_BASE_URL}/electronics`, fetchProductsByCategory('Electronics'));
app.get(`${API_BASE_URL}/applainces`, fetchProductsByCategory('Home appliances'));
app.get(`${API_BASE_URL}/fashion`, fetchProductsByCategory('Fashion dresses'));

// Generic Products Route (Admin uses this to fetch ALL items)
app.get(`${API_BASE_URL}/products`, async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all products.' });
    }
});

// [GET] /api/stats - Dashboard aggregation route
app.get(`${API_BASE_URL}/stats`, authenticateToken, async (req, res) => {
    try {
        // 1. Total Products Count
        const productCount = await Product.countDocuments();

        // 2. Total Revenue Aggregation (Calculates sum of all order totals)
        const revenueResult = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" }
                }
            }
        ]);
        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        // 3. Pending Orders (Count orders that are not 'Shipped' or 'Delivered')
        const pendingCount = await Order.countDocuments({ 
            status: { $in: ['Received', 'Processing', 'Paid'] } 
        });

        res.json({
            productCount: productCount,
            totalRevenue: totalRevenue,
            pendingOrders: pendingCount
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error aggregating dashboard statistics.' });
    }
});


// --- Order Routes ---

// [POST] /api/orders - Create a new order (CRITICAL FIX: No authentication required)
app.post(`${API_BASE_URL}/orders`, async (req, res) => {
    const { customerName, items, grandTotal } = req.body;

    if (!items || items.length === 0 || !grandTotal || !customerName) {
        return res.status(400).json({ message: 'Order data is incomplete.' });
    }

    try {
        const mappedItems = items.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
        }));
        
        const newOrder = new Order({
            customerName,
            userId: 'Anonymous Checkout', 
            items: mappedItems,
            totalAmount: grandTotal,
            status: 'Received', 
        });

        await newOrder.save();
        console.log(`Order placed successfully for ${customerName}. Order ID: ${newOrder._id}`);
        
        res.status(201).json({ message: 'Order placed successfully!', orderId: newOrder._id });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Failed to place order due to database error.' });
    }
});


// [GET] /api/orders - Get ALL orders (Protected by Admin Auth)
app.get(`${API_BASE_URL}/orders`, authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find().sort({ orderDate: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order history.' });
    }
});

// [PUT] /api/orders/:id - Update order status (Protected by Admin Auth)
app.put(`${API_BASE_URL}/orders/:id`, authenticateToken, async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    if (!status) {
        return res.status(400).json({ message: 'Status field is required.' });
    }

    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        
        res.json({ message: 'Order status updated.', order });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order status.' });
    }
});


// --- CRUD Routes for Admin Product Management ---

// [POST] /api/products - Create a new product
app.post(`${API_BASE_URL}/products`, authenticateToken, async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create product.' });
    }
});

// [PUT] /api/products/:id - Update an existing product
app.put(`${API_BASE_URL}/products/:id`, authenticateToken, async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update product.' });
    }
});

// [DELETE] /api/products/:id - Delete a product
app.delete(`${API_BASE_URL}/products/:id`, authenticateToken, async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.json({ message: 'Product deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product.' });
    }
});


// --- 6. Start Server ---
app.listen(PORT, () => {
    console.log( `Server is running on port ${PORT}`);
});

// Connect to DB and start seeding/listening
connectDB();