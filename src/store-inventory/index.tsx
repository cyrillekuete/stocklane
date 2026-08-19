import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DefaultLayout } from './layout';

const Dashboard = lazy(() =>
  import('./pages/dashboard/page').then((m) => ({ default: m.Dashboard })),
);
const AllStock = lazy(() =>
  import('./pages/all-stock/page').then((m) => ({ default: m.AllStock })),
);
const CurrentStock = lazy(() =>
  import('./pages/current-stock/page').then((m) => ({ default: m.CurrentStock })),
);
const InboundStock = lazy(() =>
  import('./pages/inbound-stock/page').then((m) => ({ default: m.InboundStock })),
);
const OutboundStock = lazy(() =>
  import('./pages/outbound-stock/page').then((m) => ({ default: m.OutboundStock })),
);
const StockPlanner = lazy(() =>
  import('./pages/stock-planner/page').then((m) => ({ default: m.StockPlanner })),
);
const ProductList = lazy(() =>
  import('./pages/product-list/page').then((m) => ({ default: m.ProductList })),
);
const ProductDetailsPage = lazy(() =>
  import('./pages/product-details/page').then((m) => ({ default: m.ProductDetailsPage })),
);
const CreateProductPage = lazy(() =>
  import('./pages/create-product/page').then((m) => ({ default: m.CreateProductPage })),
);
const EditProductPage = lazy(() =>
  import('./pages/edit-product/page').then((m) => ({ default: m.EditProductPage })),
);
const PerProductStockPage = lazy(() =>
  import('./pages/per-product-stock/page').then((m) => ({ default: m.PerProductStockPage })),
);
const TrackShippingPage = lazy(() =>
  import('./pages/track-shipping/page').then((m) => ({ default: m.TrackShippingPage })),
);
const ProductInfoPage = lazy(() =>
  import('./pages/product-info/page').then((m) => ({ default: m.ProductInfoPage })),
);
const CustomerList = lazy(() =>
  import('./pages/customer-list/page').then((m) => ({ default: m.CustomerList })),
);
const CustomerListDetails = lazy(() =>
  import('./pages/customer-list-details/page').then((m) => ({ default: m.CustomerListDetails })),
);
const SettingsModal = lazy(() =>
  import('./pages/settings-modal/page').then((m) => ({ default: m.SettingsModal })),
);
const CreateShippingLabelPage = lazy(() =>
  import('./pages/create-shipping-label/page').then((m) => ({ default: m.CreateShippingLabelPage })),
);
const ManageVariantsPage = lazy(() =>
  import('./pages/manage-variants/page').then((m) => ({ default: m.ManageVariantsPage })),
);
const CategoryList = lazy(() =>
  import('./pages/category-list/page').then((m) => ({ default: m.CategoryList })),
);
const CreateCategoryPage = lazy(() =>
  import('./pages/create-category/page').then((m) => ({ default: m.CreateCategoryPage })),
);
const EditCategoryPage = lazy(() =>
  import('./pages/edit-category/page').then((m) => ({ default: m.EditCategoryPage })),
);
const CategoryDetails = lazy(() =>
  import('./pages/category-details/page').then((m) => ({ default: m.CategoryDetails })),
);
const OrderList = lazy(() =>
  import('./pages/order-list/page').then((m) => ({ default: m.OrderList })),
);
const OrderListProducts = lazy(() =>
  import('./pages/order-list-products/page').then((m) => ({ default: m.OrderListProducts })),
);
const OrderDetailsPage = lazy(() =>
  import('./pages/order-detials/page').then((m) => ({ default: m.OrderDetailsPage })),
);
const OrderTrackingPage = lazy(() =>
  import('./pages/order-tracking/page').then((m) => ({ default: m.OrderTrackingPage })),
);
const WarehouseList = lazy(() =>
  import('./pages/warehouse-list/page').then((m) => ({ default: m.WarehouseList })),
);
const PosRegister = lazy(() =>
  import('./pages/pos/page').then((m) => ({ default: m.PosRegister })),
);
const PosSalesPage = lazy(() =>
  import('./pages/pos-sales/page').then((m) => ({ default: m.PosSalesPage })),
);

export default function StoreInventoryModule() {
  return (
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dark-sidebar" element={<Dashboard />} />
        <Route path="all-stock" element={<AllStock />} />
        <Route path="current-stock" element={<CurrentStock />} />
        <Route path="inbound-stock" element={<InboundStock />} />
        <Route path="outbound-stock" element={<OutboundStock />} />
        <Route path="stock-planner" element={<StockPlanner />} />
        <Route path="product-list" element={<ProductList />} />
        <Route path="product-details" element={<ProductDetailsPage />} />
        <Route path="create-product" element={<CreateProductPage />} />
        <Route path="edit-product" element={<EditProductPage />} />
        <Route path="per-product-stock" element={<PerProductStockPage />} />
        <Route path="track-shipping" element={<TrackShippingPage />} />
        <Route path="product-info" element={<ProductInfoPage />} />
        <Route path="customer-list" element={<CustomerList />} />
        <Route path="customer-list-details" element={<CustomerListDetails />} />
        <Route path="settings-modal" element={<SettingsModal />} />
        <Route path="create-shipping-label" element={<CreateShippingLabelPage />} />
        <Route path="manage-variants" element={<ManageVariantsPage />} />
        <Route path="category-list" element={<CategoryList />} />
        <Route path="create-category" element={<CreateCategoryPage />} />
        <Route path="edit-category" element={<EditCategoryPage />} />
        <Route path="category-details" element={<CategoryDetails />} />
        <Route path="order-list" element={<OrderList />} />
        <Route path="order-list-products" element={<OrderListProducts />} />
        <Route path="order-details" element={<OrderDetailsPage />} />
        <Route path="order-tracking" element={<OrderTrackingPage />} />
        <Route path="warehouses" element={<WarehouseList />} />
        <Route path="pos" element={<PosRegister />} />
        <Route path="pos/sales" element={<PosSalesPage />} />
      </Route>
    </Routes>
  );
}
