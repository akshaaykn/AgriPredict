import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Notfound } from './app/pages/notfound/notfound';
import { Access } from '@/pages/auth/access';
import { Login } from '@/pages/auth/login';
import { Empty } from '@/pages/empty/empty';

export const appRoutes: Routes = [
    {
        path: '', component: AppLayout, children: [
            { path: '', component: Dashboard },
            { path: 'empty', component: Empty },

        ]
    },
    { path: 'notfound', component: Notfound },
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login },
    { path: '**', redirectTo: '/notfound' }
];
