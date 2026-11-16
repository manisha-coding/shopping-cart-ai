<<<<<<< HEAD
# shopping-cart-ai
=======
# AI Shopping Cart (Educational Project)

## Requirements
- Node.js and npm
- VS Code
- Postman (optional, for API testing)
- OpenAI API key only if you want to use the AI assistant

## Setup
1. Open this folder in VS Code.
2. Open the terminal in this folder.
3. Run `npm install`.
4. Copy `.env.example` to a new file named `.env`.
5. Add your OpenAI API key to `.env` if you want AI chat:
   `OPENAI_API_KEY=your_key_here`
6. Run `npm start`.
7. Open `http://localhost:3000`.

The product, cart, and checkout APIs work without an OpenAI API key.
The AI assistant returns a configuration message until an API key is supplied.

## APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/products` | List products |
| GET | `/api/products?search=shoe` | Search products |
| GET | `/api/products?category=footwear` | Filter by category |
| GET | `/api/products/:id` | Get one product |
| GET | `/api/cart?userId=u55` | View cart |
| POST | `/api/cart/add` | Add a product |
| PATCH | `/api/cart/update` | Change quantity |
| DELETE | `/api/cart/remove` | Remove a product |
| POST | `/api/checkout` | Place a demo order |
| GET | `/api/orders?userId=u55` | View demo orders |
| GET | `/api/recommendations/:id` | Rule-based recommendations |
| POST | `/api/assistant` | AI shopping assistant |

## Postman request bodies

### Add to cart
POST `http://localhost:3000/api/cart/add`
```json
{
  "userId": "u55",
  "productId": "p101",
  "quantity": 2
}
```

### Update quantity
PATCH `http://localhost:3000/api/cart/update`
```json
{
  "userId": "u55",
  "productId": "p101",
  "quantity": 3
}
```

### Remove from cart
DELETE `http://localhost:3000/api/cart/remove`
```json
{
  "userId": "u55",
  "productId": "p101"
}
```

### Checkout
POST `http://localhost:3000/api/checkout`
```json
{
  "userId": "u55"
}
```

### Ask the AI assistant
POST `http://localhost:3000/api/assistant`
```json
{
  "sessionId": "session101",
  "message": "Suggest a fitness product under 3000 rupees"
}
```

## Important limitations
- This is a classroom prototype. Data is held in JavaScript arrays/objects and is reset when the server restarts.
- `userId` is a demonstration identifier, not secure authentication.
- Checkout simulates order placement and does not process payments.
- For a real application, use a database, authentication, authorization, input validation, rate limiting, payment-gateway integration, and database transactions.
- Never put the OpenAI API key in frontend code or commit `.env` to GitHub.
>>>>>>> 0696603 (Initial project upload)
