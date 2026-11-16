require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// --------------------
// Demo data (in memory)
// --------------------
const products = [
  {
    id: "p101",
    name: "Road Running Shoes",
    price: 3499,
    category: "footwear",
    tags: ["running", "road", "lightweight", "fitness"],
    stock: 24
  },
  {
    id: "p102",
    name: "Sports T-Shirt",
    price: 999,
    category: "clothing",
    tags: ["sports", "cotton", "fitness"],
    stock: 30
  },
  {
    id: "p103",
    name: "Smart Watch",
    price: 2499,
    category: "electronics",
    tags: ["fitness", "smart", "wearable"],
    stock: 15
  },
  {
    id: "p104",
    name: "Yoga Mat",
    price: 799,
    category: "fitness",
    tags: ["yoga", "exercise", "fitness"],
    stock: 20
  },
  {
    id: "p105",
    name: "Wireless Headphones",
    price: 1999,
    category: "electronics",
    tags: ["music", "wireless", "sports"],
    stock: 12
  }
];

// carts[userId] = { items: [{ productId, quantity, priceAtAdd }] }
const carts = {};
const orders = [];
// sessionId -> previous OpenAI response ID
const sessions = {};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

function getCart(userId) {
  if (!carts[userId]) carts[userId] = { items: [] };
  return carts[userId];
}

function getDetailedCart(cart) {
  const items = cart.items.map((item) => {
    const product = findProduct(item.productId);
    return {
      ...item,
      name: product ? product.name : "Unknown product",
      lineTotal: item.priceAtAdd * item.quantity
    };
  });

  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.lineTotal, 0)
  };
}

// --------------------
// Product APIs
// --------------------

// GET /api/products?search=shoe&category=footwear
app.get("/api/products", (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim().toLowerCase();

  let result = [...products];

  if (category) {
    result = result.filter((p) => p.category.toLowerCase() === category);
  }

  if (search) {
    result = result.filter((p) =>
      p.name.toLowerCase().includes(search) ||
      p.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  }

  res.json(result);
});

// GET /api/products/p101
app.get("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
});

// --------------------
// Cart APIs
// --------------------

// GET /api/cart?userId=u55
app.get("/api/cart", (req, res) => {
  const userId = String(req.query.userId || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const cart = getCart(userId);
  res.json(getDetailedCart(cart));
});

// POST /api/cart/add
// Body: { "userId": "u55", "productId": "p101", "quantity": 2 }
app.post("/api/cart/add", (req, res) => {
  const { userId, productId, quantity } = req.body;

  if (
    typeof userId !== "string" || !userId.trim() ||
    typeof productId !== "string" || !productId.trim() ||
    !Number.isInteger(quantity) || quantity <= 0
  ) {
    return res.status(400).json({
      error: "Provide userId, productId and a positive integer quantity"
    });
  }

  const product = findProduct(productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const cart = getCart(userId);
  const existingItem = cart.items.find((item) => item.productId === productId);
  const currentQuantity = existingItem ? existingItem.quantity : 0;

  if (currentQuantity + quantity > product.stock) {
    return res.status(400).json({
      error: `Only ${product.stock - currentQuantity} more unit(s) can be added`
    });
  }

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId,
      quantity,
      priceAtAdd: product.price
    });
  }

  res.status(201).json({
    message: "Product added to cart",
    cart: getDetailedCart(cart)
  });
});

// PATCH /api/cart/update
// Body: { "userId": "u55", "productId": "p101", "quantity": 3 }
app.patch("/api/cart/update", (req, res) => {
  const { userId, productId, quantity } = req.body;

  if (
    typeof userId !== "string" || !userId.trim() ||
    typeof productId !== "string" || !productId.trim() ||
    !Number.isInteger(quantity) || quantity <= 0
  ) {
    return res.status(400).json({
      error: "Provide userId, productId and a positive integer quantity"
    });
  }

  const cart = carts[userId];

  if (!cart) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const item = cart.items.find((entry) => entry.productId === productId);

  if (!item) {
    return res.status(404).json({ error: "Product not found in cart" });
  }

  const product = findProduct(productId);

  if (!product || quantity > product.stock) {
    return res.status(400).json({ error: "Requested quantity is not available" });
  }

  item.quantity = quantity;

  res.json({
    message: "Cart quantity updated",
    cart: getDetailedCart(cart)
  });
});

// DELETE /api/cart/remove
// Body: { "userId": "u55", "productId": "p101" }
app.delete("/api/cart/remove", (req, res) => {
  const { userId, productId } = req.body;

  if (
    typeof userId !== "string" || !userId.trim() ||
    typeof productId !== "string" || !productId.trim()
  ) {
    return res.status(400).json({
      error: "Provide userId and productId"
    });
  }

  const cart = carts[userId];

  if (!cart) {
    return res.status(404).json({ error: "Cart not found" });
  }

  const oldLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.productId !== productId);

  if (cart.items.length === oldLength) {
    return res.status(404).json({ error: "Product not found in cart" });
  }

  res.json({
    message: "Product removed from cart",
    cart: getDetailedCart(cart)
  });
});

// --------------------
// Checkout API (demo only; no real payment)
// --------------------
app.post("/api/checkout", (req, res) => {
  const { userId } = req.body;

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "userId is required" });
  }

  const cart = carts[userId];

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  // Check stock again before placing the order.
  for (const item of cart.items) {
    const product = findProduct(item.productId);

    if (!product || product.stock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for ${item.productId}`
      });
    }
  }

  const orderItems = cart.items.map((item) => {
    const product = findProduct(item.productId);
    return {
      productId: item.productId,
      name: product.name,
      quantity: item.quantity,
      unitPrice: item.priceAtAdd,
      lineTotal: item.priceAtAdd * item.quantity
    };
  });

  const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Reduce stock only after all items have passed validation.
  for (const item of cart.items) {
    findProduct(item.productId).stock -= item.quantity;
  }

  const order = {
    orderId: `ord_${Date.now()}`,
    userId,
    items: orderItems,
    total,
    status: "placed",
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  carts[userId] = { items: [] };

  res.status(201).json({
    message: "Order placed successfully (demo checkout)",
    order
  });
});

// Optional: view demo orders
app.get("/api/orders", (req, res) => {
  const userId = String(req.query.userId || "").trim();

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  res.json(orders.filter((order) => order.userId === userId));
});

// --------------------
// Rule-based recommendations API
// --------------------
app.get("/api/recommendations/:id", (req, res) => {
  const product = findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const recommendations = products.filter((candidate) =>
    candidate.id !== product.id &&
    (
      candidate.category === product.category ||
      candidate.tags.some((tag) => product.tags.includes(tag))
    )
  );

  res.json({
    product: product.name,
    recommendations
  });
});

// --------------------
// AI shopping assistant API (optional)
// --------------------
app.post("/api/assistant", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (
      typeof sessionId !== "string" || !sessionId.trim() ||
      typeof message !== "string" || !message.trim()
    ) {
      return res.status(400).json({
        error: "sessionId and message are required"
      });
    }

    if (!openai) {
      return res.status(503).json({
        error: "AI is not configured. Add OPENAI_API_KEY to the .env file."
      });
    }

    const catalogue = products.map((p) => ({
      id: p.id,
      name: p.name,
      priceINR: p.price,
      category: p.category,
      tags: p.tags,
      stock: p.stock
    }));

    const instructions = `
You are a helpful shopping assistant for a small online store.
Use only the product catalogue supplied below.
Do not invent products, prices, discounts, features, or stock information.
Prices are in Indian rupees (INR).
If no product matches the customer's request, say so clearly.
You may compare products and suggest relevant items.
Product catalogue:
${JSON.stringify(catalogue, null, 2)}
`;

    const request = {
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions,
      input: message.trim()
    };

    if (sessions[sessionId]) {
      request.previous_response_id = sessions[sessionId];
    }

    const response = await openai.responses.create(request);
    sessions[sessionId] = response.id;

    res.json({ answer: response.output_text });
  } catch (error) {
    console.error("AI assistant error:", error.message);
    res.status(500).json({
      error: "Unable to get an AI response. Check the server terminal for details."
    });
  }
});

// --------------------
// Error handling
// --------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Shopping Cart server running on port ${PORT}`);
});
