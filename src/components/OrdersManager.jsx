
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  Eye,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  X,
  MapPin,
  Phone,
  User,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import "./OrdersManager.css";

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

const statusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const formatPrice = (amount) => {
  const parsedAmount = Number(amount);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsedAmount) ? parsedAmount : 0);
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

const formatPhone = (phone) => phone || "Not provided";

export default function OrdersManager({ vendor }) {
  const vendorId = vendor?.id;
  const loadRequestId = useRef(0);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadOrders = useCallback(async (showRefresh = false) => {
    if (!vendorId) {
      loadRequestId.current += 1;
      setOrders([]);
      setOrderItems([]);
      setLoading(false);
      setRefreshing(false);
      setSelectedOrder(null);
      return;
    }

    const requestId = ++loadRequestId.current;

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          vendor_id,
          order_reference,
          customer_name,
          customer_phone,
          delivery_address,
          customer_note,
          total_amount,
          status,
          payment_status,
          created_at,
          updated_at
        `)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (orderError) throw orderError;

      const loadedOrders = orderData || [];

      if (loadedOrders.length === 0) {
        if (requestId !== loadRequestId.current) return;
        setOrders([]);
        setOrderItems([]);
        setSelectedOrder(null);
        return;
      }

      const orderIds = loadedOrders.map((order) => order.id);

      const { data: itemData, error: itemError } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          product_name,
          unit_price,
          quantity,
          line_total,
          created_at
        `)
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (itemError) throw itemError;

      if (requestId !== loadRequestId.current) return;
      setOrders(loadedOrders);
      setOrderItems(itemData || []);
      setSelectedOrder((current) =>
        current
          ? loadedOrders.find((order) => order.id === current.id) || null
          : null
      );
    } catch (err) {
      if (requestId !== loadRequestId.current) return;
      console.error("Order loading error:", err);
      setError(
        err?.message || "Unable to load orders. Please try again."
      );
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [vendorId]);

  useEffect(() => {
    loadOrders();
    return () => {
      loadRequestId.current += 1;
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!selectedOrder) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedOrder(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesFilter =
        activeFilter === "all" || order.status === activeFilter;

      const matchesSearch =
        !term ||
        [
          order.order_reference,
          order.customer_name,
          order.customer_phone,
          order.delivery_address,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term)
          );

      return matchesFilter && matchesSearch;
    });
  }, [orders, search, activeFilter]);

  const statistics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter(
        (o) =>
          o.status === "confirmed" || o.status === "processing"
      ).length,
      completed: orders.filter((o) => o.status === "completed").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      revenue: orders
        .filter((o) => o.status !== "cancelled")
        .reduce(
          (total, order) => total + Number(order.total_amount || 0),
          0
        ),
    };
  }, [orders]);

  const getItemsForOrder = (orderId) =>
    orderItems.filter((item) => item.order_id === orderId);

  const updateOrderStatus = async (order, newStatus) => {
    if (!statuses.includes(newStatus)) {
      setError("Invalid order status.");
      return;
    }

    if (!vendorId) {
      setError("The store could not be identified.");
      return;
    }

    if (order.status === newStatus) return;

    setError("");
    setSuccess("");
    setUpdatingId(order.id);

    try {
      const { data, error: updateError } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("vendor_id", vendorId)
        .select("id, status")
        .single();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error("The order could not be updated.");
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, status: data.status, updated_at: new Date().toISOString() }
            : item
        )
      );

      if (selectedOrder?.id === order.id) {
        setSelectedOrder((current) =>
          current ? { ...current, status: data.status } : current
        );
      }

      setSuccess(
        `Order ${order.order_reference} updated to ${statusLabels[newStatus]}.`
      );
    } catch (err) {
      console.error("Order status update error:", err);
      setError(
        err?.message || "Unable to update this order. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setError("");
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  const copyOrderReference = async (reference) => {
    if (!reference) {
      setError("This order does not have an order reference.");
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      setError("Clipboard access is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(reference);
      setSuccess("Order reference copied.");
    } catch {
      setError("Unable to copy the order reference.");
    }
  };

  const filters = [
    { id: "all", label: "All orders" },
    { id: "pending", label: "Pending" },
    { id: "confirmed", label: "Confirmed" },
    { id: "processing", label: "Processing" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <section className="orders-manager">
      <div className="orders-heading">
        <div>
          <span className="orders-eyebrow">STORE MANAGEMENT</span>
          <h1>Customer Orders</h1>
          <p>Track customer purchases and manage your orders.</p>
        </div>

        <button
          type="button"
          className="orders-refresh-button"
          onClick={() => loadOrders(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <LoaderCircle size={17} className="orders-spinner" />
          ) : (
            <RefreshCw size={17} />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="orders-alert orders-alert-error">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="orders-alert orders-alert-success">
          <CheckCircle2 size={17} />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="orders-stat-grid">
        <article className="orders-stat-card">
          <span className="orders-stat-icon">
            <ShoppingBag size={19} />
          </span>
          <div>
            <span>Total orders</span>
            <strong>{statistics.total}</strong>
          </div>
        </article>

        <article className="orders-stat-card">
          <span className="orders-stat-icon pending-icon">
            <Clock size={19} />
          </span>
          <div>
            <span>Pending</span>
            <strong>{statistics.pending}</strong>
          </div>
        </article>

        <article className="orders-stat-card">
          <span className="orders-stat-icon processing-icon">
            <Package size={19} />
          </span>
          <div>
            <span>In progress</span>
            <strong>{statistics.processing}</strong>
          </div>
        </article>

        <article className="orders-stat-card">
          <span className="orders-stat-icon completed-icon">
            <CheckCircle2 size={19} />
          </span>
          <div>
            <span>Completed</span>
            <strong>{statistics.completed}</strong>
          </div>
        </article>
      </div>

      <div className="orders-revenue-card">
        <div>
          <span>ORDER VALUE</span>
          <strong>{formatPrice(statistics.revenue)}</strong>
          <p>
            Total value of orders excluding cancelled orders.
            This is not necessarily money received.
          </p>
        </div>
        <ShoppingBag size={27} />
      </div>

      <div className="orders-toolbar">
        <div className="orders-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search reference, customer or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <span className="orders-count">
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      <div className="orders-filter-list">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={
              activeFilter === filter.id ? "active" : ""
            }
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
            {filter.id === "all" && (
              <span>{orders.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="orders-loading">
          <LoaderCircle size={30} className="orders-spinner" />
          <p>Loading your orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="orders-empty">
          <span>
            <ShoppingBag size={34} />
          </span>
          <h2>
            {search || activeFilter !== "all"
              ? "No matching orders"
              : "No orders yet"}
          </h2>
          <p>
            {search || activeFilter !== "all"
              ? "Try changing your search or filter."
              : "Customer orders from your online store will appear here."}
          </p>
        </div>
      ) : (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong className="orders-reference">
                      {order.order_reference}
                    </strong>
                    <span className="orders-item-count">
                      {getItemsForOrder(order.id).length}{" "}
                      {getItemsForOrder(order.id).length === 1
                        ? "item"
                        : "items"}
                    </span>
                  </td>

                  <td>
                    <strong>{order.customer_name}</strong>
                    <span className="orders-secondary">
                      {order.customer_phone}
                    </span>
                  </td>

                  <td>{formatDate(order.created_at)}</td>

                  <td>
                    <strong>{formatPrice(order.total_amount)}</strong>
                  </td>

                  <td>
                    <span
                      className={`orders-payment-pill ${order.payment_status}`}
                    >
                      {order.payment_status || "Unknown"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`orders-status-pill ${order.status}`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="orders-view-button"
                      onClick={() => openOrderDetails(order)}
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="orders-mobile-list">
            {filteredOrders.map((order) => (
              <article className="orders-mobile-card" key={order.id}>
                <div className="orders-mobile-card-top">
                  <div>
                    <strong>{order.order_reference}</strong>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <span className={`orders-status-pill ${order.status}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>

                <div className="orders-mobile-customer">
                  <strong>{order.customer_name}</strong>
                  <span>{order.customer_phone}</span>
                </div>

                <div className="orders-mobile-card-bottom">
                  <strong>{formatPrice(order.total_amount)}</strong>
                  <button
                    type="button"
                    onClick={() => openOrderDetails(order)}
                  >
                    <Eye size={15} />
                    View order
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedOrder && (
        <div
          className="orders-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderDetails();
            }
          }}
        >
          <div
            className="orders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orders-modal-title"
          >
            <div className="orders-modal-heading">
              <div>
                <span className="orders-eyebrow">ORDER DETAILS</span>
                <h2 id="orders-modal-title">
                  {selectedOrder.order_reference}
                </h2>
                <span className="orders-modal-date">
                  {formatDate(selectedOrder.created_at)}
                </span>
              </div>

              <button
                type="button"
                className="orders-modal-close"
                onClick={closeOrderDetails}
                aria-label="Close order details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="orders-modal-body">
              <section className="orders-detail-section">
                <h3>Customer information</h3>

                <div className="orders-detail-line">
                  <User size={17} />
                  <span>{selectedOrder.customer_name}</span>
                </div>

                <div className="orders-detail-line">
                  <Phone size={17} />
                  <span>{formatPhone(selectedOrder.customer_phone)}</span>
                </div>

                <div className="orders-detail-line">
                  <MapPin size={17} />
                  <span>{selectedOrder.delivery_address}</span>
                </div>

                {selectedOrder.customer_note && (
                  <div className="orders-customer-note">
                    <MessageSquare size={16} />
                    <div>
                      <strong>Customer note</strong>
                      <p>{selectedOrder.customer_note}</p>
                    </div>
                  </div>
                )}
              </section>

              <section className="orders-detail-section">
                <h3>Ordered products</h3>

                <div className="orders-detail-items">
                  {getItemsForOrder(selectedOrder.id).map((item) => (
                    <div className="orders-detail-item" key={item.id}>
                      <div>
                        <strong>{item.product_name}</strong>
                        <span>
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </span>
                      </div>
                      <strong>{formatPrice(item.line_total)}</strong>
                    </div>
                  ))}

                  {getItemsForOrder(selectedOrder.id).length === 0 && (
                    <p className="orders-no-items">
                      No product details were found for this order.
                    </p>
                  )}
                </div>

                <div className="orders-total-line">
                  <span>Order total</span>
                  <strong>
                    {formatPrice(selectedOrder.total_amount)}
                  </strong>
                </div>
              </section>

              <section className="orders-detail-section">
                <h3>Payment information</h3>

                <div className="orders-payment-detail">
                  <span>Payment status</span>
                  <strong
                    className={`orders-payment-pill ${selectedOrder.payment_status}`}
                  >
                    {selectedOrder.payment_status || "Unknown"}
                  </strong>
                </div>

                <p className="orders-payment-note">
                  Payment status is managed separately from order
                  progress. Updating the order will not change payment.
                </p>
              </section>

              <section className="orders-detail-section">
                <h3>Update order status</h3>

                <label className="orders-status-select-label">
                  Current status

                  <div className="orders-status-select-wrap">
                    <select
                      value={selectedOrder.status}
                      onChange={(event) =>
                        updateOrderStatus(
                          selectedOrder,
                          event.target.value
                        )
                      }
                      disabled={updatingId === selectedOrder.id}
                    >
                      {statuses.map((status) => (
                        <option value={status} key={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>

                    {updatingId === selectedOrder.id ? (
                      <LoaderCircle
                        size={17}
                        className="orders-spinner"
                      />
                    ) : (
                      <ChevronDown size={17} />
                    )}
                  </div>
                </label>
              </section>

              <div className="orders-modal-footer">
                <button
                  type="button"
                  className="orders-copy-button"
                  onClick={() =>
                    copyOrderReference(selectedOrder.order_reference)
                  }
                >
                  Copy order reference
                </button>

                <button
                  type="button"
                  className="orders-done-button"
                  onClick={closeOrderDetails}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
