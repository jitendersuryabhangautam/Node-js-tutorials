export function toUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    first_name: u.firstName ?? null,
    last_name: u.lastName ?? null,
    role: u.role,
    created_at: u.createdAt,
    updated_at: u.updatedAt
  };
}

export function toProduct(p) {
  if (!p) return null;
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price),
    stock: p.stockQuantity,
    category: p.category ?? null,
    image_url: p.imageUrl ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt
  };
}

export function toCartItem(i) {
  return {
    id: i.id,
    cart_id: i.cartId,
    product_id: i.productId,
    product: i.product ? toProduct(i.product) : undefined,
    quantity: i.quantity,
    created_at: i.createdAt
  };
}

export function toCart(c) {
  return {
    id: c.id,
    user_id: c.userId,
    items: c.items ? c.items.map(toCartItem) : [],
    created_at: c.createdAt,
    updated_at: c.updatedAt
  };
}

export function toOrderItem(i) {
  return {
    id: i.id,
    order_id: i.orderId,
    product_id: i.productId,
    product: i.product ? toProduct(i.product) : undefined,
    quantity: i.quantity,
    price_at_time: Number(i.priceAtTime),
    created_at: i.createdAt
  };
}

export function toOrder(o) {
  return {
    id: o.id,
    user_id: o.userId,
    order_number: o.orderNumber,
    total_amount: Number(o.totalAmount),
    status: o.status,
    payment_method: o.paymentMethod ?? null,
    shipping_address: o.shippingAddress,
    billing_address: o.billingAddress,
    items: o.items ? o.items.map(toOrderItem) : [],
    created_at: o.createdAt,
    updated_at: o.updatedAt
  };
}

export function toPayment(p) {
  return {
    id: p.id,
    order_id: p.orderId,
    amount: Number(p.amount),
    status: p.status,
    payment_method: p.paymentMethod,
    transaction_id: p.transactionId ?? null,
    payment_details: p.paymentDetails ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt
  };
}

export function toReturn(r) {
  return {
    id: r.id,
    order_id: r.orderId,
    user_id: r.userId,
    reason: r.reason,
    status: r.status,
    refund_amount: r.refundAmount ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt
  };
}