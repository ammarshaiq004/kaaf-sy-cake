/**
 * Real customer reviews only, added with the customer's permission.
 * Leave empty until there are some; the reviews page shows an honest
 * empty state instead of placeholder testimonials.
 */
export interface Review {
  name: string;
  occasion?: string;
  text: string;
  /** Optional photo of their cake, e.g. 'images/reviews/ayesha.webp' (no leading slash). */
  photo?: string;
  date?: string;
}

export const REVIEWS: Review[] = [];
