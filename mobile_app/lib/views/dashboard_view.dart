import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/database_helper.dart';
import '../services/sync_service.dart';
import 'login_view.dart';
import 'screening_entry_view.dart';
import 'patient_list_view.dart';
import 'vision_centers_view.dart';
import 'facility_schedule_view.dart';

class DashboardView extends StatefulWidget {
  final UserModel user;

  const DashboardView({super.key, required this.user});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  int _unsyncedCount = 0;
  bool _isLoading = true;
  Map<String, dynamic>? _summaryStats;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    // Auto sync when network returns
    SyncService.initAutoSyncListener(() {
      if (mounted) _loadDashboardData();
    });
  }

  @override
  void dispose() {
    SyncService.disposeListener();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    final count = await DatabaseHelper.instance.getUnsyncedCount();

    try {
      final stats = await ApiService.fetchDashboardStats();
      if (mounted) {
        setState(() {
          _unsyncedCount = count;
          _summaryStats = stats['summary'];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _unsyncedCount = count;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _triggerManualSync() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Starting background sync with server...')),
    );
    final count = await SyncService.syncPendingPatients();
    await _loadDashboardData();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(count > 0 ? 'Successfully synced $count records!' : 'All records are up to date.'),
          backgroundColor: AppConstants.successGreen,
        ),
      );
    }
  }

  Future<void> _handleExplicitLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Sign Out?"),
        content: const Text("Are you sure you want to sign out of Netrartha? Your offline pending data will remain safely saved in local storage."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppConstants.dangerRed),
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Sign Out", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await ApiService.logout();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginView()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: AppConstants.navyDark,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.remove_red_eye, color: AppConstants.primaryOrange, size: 24),
            const SizedBox(width: 8),
            const Text(
              "Netrartha",
              style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white),
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: AppConstants.primaryOrange,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                "v1",
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: Colors.white),
            onPressed: _triggerManualSync,
            tooltip: "Sync Pending Data",
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white70),
            onPressed: _handleExplicitLogout,
            tooltip: "Sign Out",
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Greeting Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppConstants.primaryOrange, AppConstants.primaryOrangeDark],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppConstants.primaryOrange.withOpacity(0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            widget.user.userType.toUpperCase().replaceAll('_', ' '),
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                        ),
                        if (_unsyncedCount > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppConstants.warningAmber,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.wifi_off, size: 12, color: Colors.white),
                                const SizedBox(width: 4),
                                Text(
                                  "$_unsyncedCount Pending Sync",
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Welcome, ${widget.user.name}",
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    Text(
                      "Unit: ${widget.user.assignedTrack ?? 'Sankara Eye Hospital Shimoga'}",
                      style: const TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Quick Screening Entry Button
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => ScreeningEntryView(user: widget.user)),
                  ).then((_) => _loadDashboardData());
                },
                icon: const Icon(Icons.add_a_photo, size: 22),
                label: const Text(
                  "NEW PATIENT SCREENING",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.navyDark,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 3,
                ),
              ),

              const SizedBox(height: 24),

              const Text(
                "Quick Navigation & Tools",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppConstants.navyDark),
              ),
              const SizedBox(height: 12),

              // Navigation Cards Grid
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  _buildNavCard(
                    context,
                    title: "Patient Records",
                    subtitle: "Directory & History",
                    icon: Icons.assignment_outlined,
                    color: Colors.blue,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => PatientListView(user: widget.user)),
                      );
                    },
                  ),
                  _buildNavCard(
                    context,
                    title: "Vision Centers",
                    subtitle: "Satellite Clinics & VC",
                    icon: Icons.business_outlined,
                    color: Colors.purple,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => VisionCentersView(user: widget.user)),
                      );
                    },
                  ),
                  _buildNavCard(
                    context,
                    title: "Facility Dispatch",
                    subtitle: "Camps & Vehicles",
                    icon: Icons.local_shipping_outlined,
                    color: Colors.orange,
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => FacilityScheduleView(user: widget.user)),
                      );
                    },
                  ),
                  _buildNavCard(
                    context,
                    title: "Offline Sync",
                    subtitle: "$_unsyncedCount Pending Items",
                    icon: Icons.cloud_upload_outlined,
                    color: _unsyncedCount > 0 ? Colors.amber : Colors.green,
                    onTap: _triggerManualSync,
                  ),
                ],
              ),

              const SizedBox(height: 24),

              const Text(
                "Unit Summary KPIs",
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppConstants.navyDark),
              ),
              const SizedBox(height: 12),

              // KPI Stats Cards
              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else ...[
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiStatCard(
                        "Total Screened",
                        "${_summaryStats?['totalPatients'] ?? 0}",
                        Icons.people_outline,
                        AppConstants.navyDark,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildKpiStatCard(
                        "Today's Count",
                        "${_summaryStats?['todayScreening'] ?? 0}",
                        Icons.today,
                        AppConstants.primaryOrange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiStatCard(
                        "DR Detected",
                        "${_summaryStats?['positiveDR'] ?? 0}",
                        Icons.warning_amber_rounded,
                        AppConstants.dangerRed,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildKpiStatCard(
                        "Vision Centers",
                        "${_summaryStats?['visionCenterCount'] ?? 0}",
                        Icons.domain,
                        Colors.indigo,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 10, color: AppConstants.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKpiStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppConstants.borderLight),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color),
              ),
              Text(
                label,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppConstants.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
