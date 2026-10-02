import { Enquiry } from '../models/index.js';
import { sendNewEnquiryEmail } from './emailService.js';

/** Saves a contact-form enquiry and notifies the admin by email. */
export async function createEnquiry(input) {
  const enquiry = await Enquiry.create(input);
  await sendNewEnquiryEmail(enquiry.get({ plain: true }));
  return { id: enquiry.id };
}
