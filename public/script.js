const currentUserId = "u55";
const sessionId = "session101";

const productsContainer = document.getElementById("products");
const cartContainer = document.getElementById("cart");
const cartTotal = document.getElementById("cartTotal");
const checkoutMessage = document.getElementById("checkoutMessage");
const aiAnswer = document.getElementById("aiAnswer");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function loadProducts() {
  try {
    const search = document.getElementById("searchInput").value.trim();
    const category = document.getElementById("categoryFilter").value;

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    const query = params.toString();
    const products = await apiRequest(`/api/products${query ? `?${query}` : ""}`);

    if (products.length === 0) {
      productsContainer.innerHTML = "<p>No products found.</p>";
      return;
    }

    productsContainer.innerHTML = products.map((product) => `
      <article class="product-card">
        <h3>${escapeHTML(product.name)}</h3>
        <p>Price: ₹${product.price.toLocaleString("en-IN")}</p>
        <p class="muted">Category: ${escapeHTML(product.category)}</p>
        <p class="muted">Available stock: ${product.stock}</p>
        <button data-add="${escapeHTML(product.id)}">Add to cart</button>
        <button class="secondary" data-recommend="${escapeHTML(product.id)}">
          Similar products
        </button>
      </article>
    `).join("");
  } catch (error) {
    productsContainer.textContent = error.message;
  }
}

async function loadCart() {
  try {
    const cart = await apiRequest(
      `/api/cart?userId=${encodeURIComponent(currentUserId)}`
    );

    if (cart.items.length === 0) {
      cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    } else {
      cartContainer.innerHTML = cart.items.map((item) => `
        <div class="cart-item">
          <div>
            <strong>${escapeHTML(item.name)}</strong>
            <p class="muted">₹${item.priceAtAdd.toLocaleString("en-IN")} each</p>
          </div>
          <div>
            <label>
              Qty
              <input
                type="number"
                min="1"
                max="99"
                value="${item.quantity}"
                data-quantity="${escapeHTML(item.productId)}"
              >
            </label>
            <button data-update="${escapeHTML(item.productId)}">Update</button>
            <button class="danger" data-remove="${escapeHTML(item.productId)}">Remove</button>
          </div>
          <strong>₹${item.lineTotal.toLocaleString("en-IN")}</strong>
        </div>
      `).join("");
    }

    cartTotal.textContent = `Total: ₹${cart.totalPrice.toLocaleString("en-IN")}`;
  } catch (error) {
    cartContainer.textContent = error.message;
  }
}

async function addToCart(productId) {
  try {
    await apiRequest("/api/cart/add", {
      method: "POST",
      body: JSON.stringify({
        userId: currentUserId,
        productId,
        quantity: 1
      })
    });
    await loadCart();
    checkoutMessage.textContent = "Product added to cart.";
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
}

async function updateCart(productId) {
  const input = document.querySelector(`[data-quantity="${productId}"]`);
  const quantity = Number(input.value);

  try {
    await apiRequest("/api/cart/update", {
      method: "PATCH",
      body: JSON.stringify({
        userId: currentUserId,
        productId,
        quantity
      })
    });
    await loadCart();
    checkoutMessage.textContent = "Cart updated.";
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
}

async function removeFromCart(productId) {
  try {
    await apiRequest("/api/cart/remove", {
      method: "DELETE",
      body: JSON.stringify({
        userId: currentUserId,
        productId
      })
    });
    await loadCart();
    checkoutMessage.textContent = "Product removed.";
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
}

async function checkout() {
  try {
    const result = await apiRequest("/api/checkout", {
      method: "POST",
      body: JSON.stringify({ userId: currentUserId })
    });

    checkoutMessage.textContent =
      `${result.message}. Order ID: ${result.order.orderId}. Total: ₹${result.order.total}`;
    await loadCart();
    await loadProducts();
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
}

async function askAI() {
  const message = document.getElementById("questionInput").value.trim();

  if (!message) {
    aiAnswer.textContent = "Please enter a question.";
    return;
  }

  aiAnswer.textContent = "Thinking...";

  try {
    const result = await apiRequest("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ sessionId, message })
    });
    aiAnswer.textContent = result.answer;
  } catch (error) {
    aiAnswer.textContent = error.message;
  }
}

async function showRecommendations(productId) {
  try {
    const result = await apiRequest(`/api/recommendations/${productId}`);
    if (result.recommendations.length === 0) {
      checkoutMessage.textContent = "No similar products found.";
    } else {
      checkoutMessage.textContent =
        `You may also like: ${result.recommendations.map(p => p.name).join(", ")}`;
    }
  } catch (error) {
    checkoutMessage.textContent = error.message;
  }
}

// Event delegation for product and cart buttons.
productsContainer.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const recommendationButton = event.target.closest("[data-recommend]");

  if (addButton) addToCart(addButton.dataset.add);
  if (recommendationButton) showRecommendations(recommendationButton.dataset.recommend);
});

cartContainer.addEventListener("click", (event) => {
  const updateButton = event.target.closest("[data-update]");
  const removeButton = event.target.closest("[data-remove]");

  if (updateButton) updateCart(updateButton.dataset.update);
  if (removeButton) removeFromCart(removeButton.dataset.remove);
});

document.getElementById("searchButton").addEventListener("click", loadProducts);
document.getElementById("checkoutButton").addEventListener("click", checkout);
document.getElementById("askButton").addEventListener("click", askAI);

loadProducts();
loadCart();
