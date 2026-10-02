import { Customer } from '../models/index.js';

export function serializeCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    // The profile step after the first login asks for whatever is missing.
    profileComplete: Boolean(customer.name && customer.phone),
  };
}

export function findCustomerById(id) {
  return Customer.findByPk(id);
}

export async function updateCustomerProfile(customer, { name, phone }) {
  customer.name = name;
  customer.phone = phone;
  await customer.save();
  return serializeCustomer(customer);
}
