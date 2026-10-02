import {
  getBlogPost,
  getHomeContent,
  listBlogPosts,
  listDestinations,
  listGallery,
  listOffers,
} from '../services/contentService.js';
import { createEnquiry } from '../services/enquiryService.js';
import { getPackageAvailability, getPackageDetail, listPackages } from '../services/packageCatalogService.js';
import { getPublicSettings } from '../services/settingsService.js';

export async function home(_req, res) {
  res.json({ data: await getHomeContent() });
}

export async function packages(req, res) {
  res.json(await listPackages(req.validated.query));
}

export async function packageDetail(req, res) {
  res.json({ data: await getPackageDetail(req.params.slug) });
}

export async function packageAvailability(req, res) {
  res.json({ data: await getPackageAvailability(req.params.slug, req.validated.query.month) });
}

export async function destinations(_req, res) {
  res.json({ data: await listDestinations() });
}

export async function offers(_req, res) {
  res.json({ data: await listOffers() });
}

export async function gallery(req, res) {
  res.json({ data: await listGallery({ category: req.validated.query.category }) });
}

export async function blog(req, res) {
  res.json(await listBlogPosts(req.validated.query));
}

export async function blogPost(req, res) {
  res.json({ data: await getBlogPost(req.params.slug) });
}

export async function publicSettings(_req, res) {
  res.json({ data: await getPublicSettings() });
}

export async function enquiry(req, res) {
  res.status(201).json({ data: await createEnquiry(req.validated.body) });
}
