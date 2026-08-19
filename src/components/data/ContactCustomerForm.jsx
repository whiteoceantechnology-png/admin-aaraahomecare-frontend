// POST /admin/orders/{id}/contact actually sends a message to the customer —
// unlike the drawer's existing "Contact Customer" quick action (clipboard
// copy only, still available separately), this is a real outbound
// communication. So it always requires an admin-typed message rather than a
// fabricated default — never auto-sending invented text to a real customer.
import { useState } from "react";

const ContactCustomerForm = ({ order, onSubmit, loading }) => {
  const email = order?.customer?.email;
  const phone = order?.customer?.phone;
  const [channel, setChannel] = useState(email ? "email" : "sms");
  const [message, setMessage] = useState("");

  if (!order) {
    return <p className="text-sm text-gray-500 text-center py-8">Select an order to contact the customer.</p>;
  }

  if (!email && !phone) {
    return <p className="text-sm text-gray-500 text-center py-8">No contact details on file for this customer.</p>;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ channel, message });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-[13px] text-gray-500">
        Contacting customer for order{" "}
        <span className="font-medium text-gray-800">{order.orderNumber}</span>
      </p>

      <div className="flex flex-col">
        <label className="text-[13px] font-medium text-gray-700 mb-1">Channel</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
        >
          <option value="email" disabled={!email}>
            Email{email ? ` (${email})` : " — not on file"}
          </option>
          <option value="sms" disabled={!phone}>
            SMS{phone ? ` (${phone})` : " — not on file"}
          </option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-[13px] font-medium text-gray-700 mb-1">Message</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type the message to send..."
          required
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--mk-primary-ring)] focus:border-[var(--mk-primary)]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="px-4 py-2.5 rounded-lg text-[14px] font-semibold text-white bg-[var(--mk-primary)] hover:bg-[var(--mk-primary-hover)] shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
};

export default ContactCustomerForm;
