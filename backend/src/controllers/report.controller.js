import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import Investor from '../models/Investor.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import sendSuccess from '../utils/ApiResponse.js';
import { resolveDateRange } from './sale.controller.js';

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const dashboard = asyncHandler(async (req, res) => {
  const { range, startDate, endDate } = req.query;
  const dateFilter = resolveDateRange(range, startDate, endDate);
  const soldAtMatch = {};
  if (dateFilter.$gte || dateFilter.$lte) {
    soldAtMatch.soldAt = {};
    if (dateFilter.$gte) soldAtMatch.soldAt.$gte = dateFilter.$gte;
    if (dateFilter.$lte) soldAtMatch.soldAt.$lte = dateFilter.$lte;
  }

  const [
    productStats, todaySales, monthSales, rangeSales, lowStockCount, investorStats, adminCount,
    salesByAgeGroup, salesByDesign, salesByProductType, salesByColor, dailySales, topDesigns,
  ] = await Promise.all([
    Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalProducts: { $sum: 1 }, totalStock: { $sum: '$currentStock' }, totalStockValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } } } },
    ]),
    Sale.aggregate([
      { $match: { soldAt: { $gte: startOfToday() } } },
      { $group: { _id: null, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: { soldAt: { $gte: startOfMonth() } } },
      { $group: { _id: null, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Sale.aggregate([
      { $match: soldAtMatch },
      { $group: { _id: null, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    ]),
    Product.countDocuments({ isActive: true, $expr: { $lte: ['$currentStock', '$reorderLevel'] } }),
    Investor.aggregate([
      { $group: { _id: null, totalInvestors: { $sum: 1 }, totalInvestment: { $sum: '$investmentAmount' }, activeInvestors: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } } } },
    ]),
    User.countDocuments({}),
    Sale.aggregate([
      { $match: soldAtMatch },
      { $lookup: { from: 'agegroups', localField: 'ageGroup', foreignField: '_id', as: 'ageGroupDoc' } },
      { $unwind: '$ageGroupDoc' },
      { $group: { _id: '$ageGroupDoc.name', quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { quantity: -1 } },
    ]),
    Sale.aggregate([
      { $match: soldAtMatch },
      { $lookup: { from: 'designs', localField: 'design', foreignField: '_id', as: 'designDoc' } },
      { $unwind: '$designDoc' },
      { $group: { _id: '$designDoc.name', quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { quantity: -1 } },
    ]),
    Sale.aggregate([
      { $match: soldAtMatch },
      { $lookup: { from: 'producttypes', localField: 'productType', foreignField: '_id', as: 'typeDoc' } },
      { $unwind: '$typeDoc' },
      { $group: { _id: '$typeDoc.name', quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { quantity: -1 } },
    ]),
    Sale.aggregate([
      { $match: soldAtMatch },
      { $lookup: { from: 'colors', localField: 'color', foreignField: '_id', as: 'colorDoc' } },
      { $unwind: '$colorDoc' },
      { $group: { _id: '$colorDoc.name', hexCode: { $first: '$colorDoc.hexCode' }, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { quantity: -1 } },
    ]),
    Sale.aggregate([
      { $match: { soldAt: { $gte: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } }, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: soldAtMatch },
      { $lookup: { from: 'designs', localField: 'design', foreignField: '_id', as: 'designDoc' } },
      { $unwind: '$designDoc' },
      { $group: { _id: '$designDoc.name', quantity: { $sum: '$quantity' } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const lowStockProducts = await Product.find({ isActive: true, $expr: { $lte: ['$currentStock', '$reorderLevel'] } })
    .populate([{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }, { path: 'color', select: 'name hexCode' }])
    .sort({ currentStock: 1 })
    .limit(10);

  const recentSales = await Sale.find({})
    .populate([{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }, { path: 'color', select: 'name hexCode' }, { path: 'soldBy', select: 'name' }])
    .sort({ soldAt: -1 })
    .limit(10);

  sendSuccess(res, {
    message: 'Dashboard data fetched successfully.',
    data: {
      totalProducts: productStats[0]?.totalProducts || 0,
      totalAvailableStock: productStats[0]?.totalStock || 0,
      totalStockValue: productStats[0]?.totalStockValue || 0,
      todaySalesCount: todaySales[0]?.count || 0,
      todayQuantitySold: todaySales[0]?.quantity || 0,
      todayRevenue: todaySales[0]?.revenue || 0,
      monthRevenue: monthSales[0]?.revenue || 0,
      monthQuantitySold: monthSales[0]?.quantity || 0,
      rangeRevenue: rangeSales[0]?.revenue || 0,
      rangeQuantitySold: rangeSales[0]?.quantity || 0,
      lowStockCount,
      totalInvestors: investorStats[0]?.totalInvestors || 0,
      totalInvestment: investorStats[0]?.totalInvestment || 0,
      activeInvestors: investorStats[0]?.activeInvestors || 0,
      totalAdminUsers: adminCount,
      lowStockProducts,
      recentSales,
      charts: { salesByAgeGroup, salesByDesign, salesByProductType, salesByColor, dailySales, topDesigns },
    },
  });
});

export const salesReport = asyncHandler(async (req, res) => {
  const { range, startDate, endDate } = req.query;
  const dateFilter = resolveDateRange(range, startDate, endDate);
  const match = {};
  if (dateFilter.$gte || dateFilter.$lte) {
    match.soldAt = {};
    if (dateFilter.$gte) match.soldAt.$gte = dateFilter.$gte;
    if (dateFilter.$lte) match.soldAt.$lte = dateFilter.$lte;
  }

  const summary = await Sale.aggregate([
    { $match: match },
    { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalQuantity: { $sum: '$quantity' }, totalSales: { $sum: 1 } } },
  ]);

  const daily = await Sale.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } }, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { _id: 1 } },
  ]);

  sendSuccess(res, { message: 'Sales report generated successfully.', data: { summary: summary[0] || { totalRevenue: 0, totalQuantity: 0, totalSales: 0 }, daily } });
});

export const inventoryReport = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .populate([{ path: 'ageGroup', select: 'name' }, { path: 'design', select: 'name' }, { path: 'productType', select: 'name' }, { path: 'color', select: 'name hexCode' }])
    .sort({ currentStock: 1 });

  const summary = products.reduce(
    (acc, p) => {
      acc.totalStock += p.currentStock;
      acc.totalStockValue += p.currentStock * p.costPrice;
      acc.totalSold += p.totalSold;
      if (p.currentStock <= 0) acc.outOfStock += 1;
      else if (p.currentStock <= p.reorderLevel) acc.lowStock += 1;
      return acc;
    },
    { totalStock: 0, totalStockValue: 0, totalSold: 0, outOfStock: 0, lowStock: 0 }
  );

  sendSuccess(res, { message: 'Inventory report generated successfully.', data: { products, summary } });
});

export const designReport = asyncHandler(async (req, res) => {
  const data = await Sale.aggregate([
    { $lookup: { from: 'designs', localField: 'design', foreignField: '_id', as: 'designDoc' } },
    { $unwind: '$designDoc' },
    { $group: { _id: '$designDoc.name', quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { quantity: -1 } },
  ]);
  sendSuccess(res, { message: 'Design report generated successfully.', data });
});

export const ageGroupReport = asyncHandler(async (req, res) => {
  const data = await Sale.aggregate([
    { $lookup: { from: 'agegroups', localField: 'ageGroup', foreignField: '_id', as: 'ageGroupDoc' } },
    { $unwind: '$ageGroupDoc' },
    { $group: { _id: '$ageGroupDoc.name', quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { quantity: -1 } },
  ]);
  sendSuccess(res, { message: 'Age group report generated successfully.', data });
});

export const productTypeReport = asyncHandler(async (req, res) => {
  const data = await Sale.aggregate([
    { $lookup: { from: 'producttypes', localField: 'productType', foreignField: '_id', as: 'typeDoc' } },
    { $unwind: '$typeDoc' },
    { $group: { _id: '$typeDoc.name', quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { quantity: -1 } },
  ]);
  sendSuccess(res, { message: 'Product type report generated successfully.', data });
});

export const colorReport = asyncHandler(async (req, res) => {
  const data = await Sale.aggregate([
    { $lookup: { from: 'colors', localField: 'color', foreignField: '_id', as: 'colorDoc' } },
    { $unwind: '$colorDoc' },
    { $group: { _id: '$colorDoc.name', hexCode: { $first: '$colorDoc.hexCode' }, quantity: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
    { $sort: { quantity: -1 } },
  ]);
  sendSuccess(res, { message: 'Color report generated successfully.', data });
});

export default { dashboard, salesReport, inventoryReport, designReport, ageGroupReport, productTypeReport, colorReport };
