import { Router } from 'express';
import { protect } from '../middleware/auth.js';

import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import customerRoutes from './customer.routes.js';
import saleRoutes from './sale.routes.js';
import scrapSaleRoutes from './scrapSale.routes.js';
import exchangeRoutes from './exchange.routes.js';
import rateRoutes from './rate.routes.js';
import dispatchRoutes from './dispatch.routes.js';
import paymentRoutes from './payment.routes.js';
import returnRoutes from './return.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes from './notification.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';

/**
 * API route map (Part 2) + frontend aliases
 *
 * POST   /api/auth/login
 * GET    /api/products
 * POST   /api/sales
 * POST   /api/scrap-sales
 * POST   /api/exchange
 * PUT    /api/rates
 * POST   /api/dispatch
 * POST   /api/payments
 * POST   /api/returns
 * GET    /api/reports/:type
 * GET    /api/notifications/pending-payments
 */
const router = Router();

router.use('/auth', authRoutes);

// Protected app routes
router.use(protect);

router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);

// Part 2 canonical + frontend aliases
router.use('/scrap-sales', scrapSaleRoutes);
router.use('/scrap/sales', scrapSaleRoutes);

router.use('/exchange', exchangeRoutes);
router.use('/exchanges', exchangeRoutes);

router.use('/rates', rateRoutes);

router.use('/dispatch', dispatchRoutes);
router.use('/dispatches', dispatchRoutes);

router.use('/payments', paymentRoutes);
router.use('/returns', returnRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);

export default router;
