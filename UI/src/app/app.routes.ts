import { Routes } from '@angular/router';
import { MenuListComponent } from './features/menu/menu-list/menu-list';
import { OrdersListComponent } from './features/orders/order-list/order-list';
import { CreateOrderComponent } from './features/orders/create-order/create-order';
import { DashboardComponent } from './features/dashboard/dashboard';
import { LoginComponent } from './features/auth/login/login';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [authGuard] }, 
  { path: 'menu', component: MenuListComponent },
  { path: 'orders', component: OrdersListComponent },
  { path: 'create-order', component: CreateOrderComponent },
  { path: 'login', component: LoginComponent }
];