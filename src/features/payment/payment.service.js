import cashfree from "../../config/cashfree.js";



export const createCashfreeOrder = async (orderId, orderAmount, currency, packageId, customer) => {

   

    const orderRequest = {
      order_id: orderId,
      order_amount: String(orderAmount),
      order_currency: currency,
      customer_details: {
        customer_id: String(customer.id),
        customer_name: customer.name || "test",
        customer_phone: customer.phone,
      },
      order_meta: {
        return_url: `${process.env.RETURN_URL}?order_id=${orderId}`,
      },
      order_note: customer.note || "",
    };

    const response = await cashfree.PGCreateOrder(orderRequest);
    const order = response.data;

    return {
      orderId: order.order_id,
      paymentLink: order.payment_link,
    };
  }


