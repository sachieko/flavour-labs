/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
const express = require('express');
require('dotenv').config();
const router  = express.Router();
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const smsServiceSID = process.env.SMS_SERVICE_SID;
const client = require('twilio')(accountSid, authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const orders = require('../db/queries/orders');

const sendMsg = function(msg, phone) {
  client.messages.create({
    body: msg,
    messagingServiceSid: smsServiceSID,
    to: phone
  });
};

router.get('/customer', (req, res) => {
  const orderId = req.cookies.orderId;
  if (!orderId) {
    return res.status(400).end();
  }
  orders.getOrderById(orderId)
    .then((order) =>{
      const customerMsg = `Welcome to Flavour Town ${order.name}. We have received your order.`;
      const restaurantMsg = `New order id: ${order.id} from ${order.name} with phone ${order.phone}`;
      sendMsg(customerMsg, order.phone);
      sendMsg(restaurantMsg, process.env.RESTAURANT_PHONE);
      res.end();
    });
});

router.post('/restaurant', (req, res) => {
  const isAdmin = req.cookies.chef;
  if (!isAdmin && req.body.From !== process.env.RESTAURANT_PHONE) {
    return res.status(400).end();
  }
  let args;
  if (req.body.From === process.env.RESTAURANT_PHONE) {
    args = req.body.Body.split(' ');
  }
  if (isAdmin) {
    args = [req.body.cmd];
    args.push(req.body.id);
    req.body.est ? args.push(req.body.est) : null;
  }
  const cmd = args[0];
  const id = args[1];
  const estimate = args[2];
  const twiml = new MessagingResponse();
  if (cmd !== 'Start' && cmd !== 'Estimate' && cmd !== 'Complete') {
    twiml.message(
      `Oops. The optional commands are Start 'orderId', Estimate 'OrderId' 'minutes', or Complete 'orderId'`
    );
    res.writeHead(200, {'Content-Type': 'text/xml'});
    return res.end(twiml.toString());
  }
  orders.updateField(cmd, id, estimate)
    .then((updatedOrder) => {
      twiml.message(`Updated order ${updatedOrder.id}`);
      if (cmd === 'Estimate') {
        sendMsg(`Your order from Flavour Labs will be ready in approximately ${estimate} minutes.`, updatedOrder.phone);
      }
      if (cmd === 'Complete') {
        sendMsg(`Your order from Flavour Labs is ready for pickup!`, updatedOrder.phone);
      }
      res.writeHead(200, {'Content-Type': 'text/xml'});
      return res.end(twiml.toString());
    })
    .catch((err) => {
      console.log(err);
      twiml.message(`oops wrong something went wrong. We got ${cmd}, ${id}, ${estimate}`);
      res.writeHead(200, {'Content-Type': 'text/xml'});
      return res.end(twiml.toString());
    });
});

module.exports = router;
