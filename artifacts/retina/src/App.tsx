import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SetPassword from "@/pages/set-password";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import StaffChangePassword from "@/pages/staff/change-password";

import DrsmsDashboard from "@/pages/drsms-dashboard";
import DrsmsPatients from "@/pages/drsms-patients";
import DrsmsScreeningEntry from "@/pages/drsms-screening-entry";
import DrsmsPatientDetails from "@/pages/drsms-patient-details";
import DrsmsScreeningPlaces from "@/pages/drsms-screening-places";
import DrsmsUsers from "@/pages/drsms-users";
import DrsmsReports from "@/pages/drsms-reports";
import DrsmsSettings from "@/pages/drsms-settings";
import DrsmsVisionCenters from "@/pages/drsms-vision-centers";
import DrsmsFacilitySchedule from "@/pages/drsms-facility-schedule";
import DrsmsAshaReferrals from "@/pages/drsms-asha-referrals";
import DrsmsFollowUp from "@/pages/drsms-follow-up";
import DrsmsAnalytics from "@/pages/drsms-analytics";
import DrsmsRbhTracking from "@/pages/drsms-rbh-tracking";

// Wire the stored JWT into every generated API hook so useGetMe etc. send auth headers
setAuthTokenGetter(() => localStorage.getItem("vision2020_token"));

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/set-password" component={SetPassword} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/staff/change-password" component={StaffChangePassword} />

      {/* DRSMS PWA Routes */}
      <Route path="/dashboard">
        {() => <AppLayout><DrsmsDashboard /></AppLayout>}
      </Route>
      <Route path="/analytics">
        {() => <AppLayout><DrsmsAnalytics /></AppLayout>}
      </Route>
      <Route path="/rbh-tracking">
        {() => <AppLayout><DrsmsRbhTracking /></AppLayout>}
      </Route>
      <Route path="/vision-centers">
        {() => <AppLayout><DrsmsVisionCenters /></AppLayout>}
      </Route>
      <Route path="/asha-referrals">
        {() => <AppLayout><DrsmsAshaReferrals /></AppLayout>}
      </Route>
      <Route path="/follow-up">
        {() => <AppLayout><DrsmsFollowUp /></AppLayout>}
      </Route>
      <Route path="/facility-schedule">
        {() => <AppLayout><DrsmsFacilitySchedule /></AppLayout>}
      </Route>
      <Route path="/patients">
        {() => <AppLayout><DrsmsPatients /></AppLayout>}
      </Route>
      <Route path="/patients/new">
        {() => <AppLayout><DrsmsScreeningEntry /></AppLayout>}
      </Route>
      <Route path="/patients/:id">
        {({ id }) => <AppLayout><DrsmsPatientDetails params={{ id }} /></AppLayout>}
      </Route>
      <Route path="/patients/:id/edit">
        {() => <AppLayout><DrsmsScreeningEntry /></AppLayout>}
      </Route>
      <Route path="/screening-places">
        {() => <AppLayout><DrsmsScreeningPlaces /></AppLayout>}
      </Route>
      <Route path="/users">
        {() => <AppLayout><DrsmsUsers /></AppLayout>}
      </Route>
      <Route path="/reports">
        {() => <AppLayout><DrsmsReports /></AppLayout>}
      </Route>
      <Route path="/settings">
        {() => <AppLayout><DrsmsSettings /></AppLayout>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
