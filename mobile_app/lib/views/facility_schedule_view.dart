import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/screening_place_model.dart';
import '../services/api_service.dart';

class FacilityScheduleView extends StatefulWidget {
  final UserModel user;

  const FacilityScheduleView({super.key, required this.user});

  @override
  State<FacilityScheduleView> createState() => _FacilityScheduleViewState();
}

class _FacilityScheduleViewState extends State<FacilityScheduleView> {
  List<ScreeningPlaceModel> _camps = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSchedule();
  }

  Future<void> _fetchSchedule() async {
    setState(() => _isLoading = true);
    try {
      final camps = await ApiService.fetchScreeningPlaces();
      if (mounted) {
        setState(() {
          _camps = camps;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: AppConstants.navyDark,
        title: const Text("Facility Transport Dispatch", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _camps.length,
              itemBuilder: (context, index) {
                final camp = _camps[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "Code: ${camp.shortCode}",
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppConstants.primaryOrange),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: camp.status == 'completed' ? Colors.green.withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                camp.status.toUpperCase(),
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: camp.status == 'completed' ? Colors.green : Colors.red),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          camp.name,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "Location: ${camp.taluk ?? 'Central'}, ${camp.district}, ${camp.state}",
                          style: const TextStyle(fontSize: 11, color: AppConstants.textMuted),
                        ),
                        const SizedBox(height: 10),
                        const Divider(height: 1),
                        const SizedBox(height: 10),

                        // Empty Handwriting / Logistics Box in App
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.directions_bus_outlined, size: 18, color: Colors.amber),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "Vehicle Assigned: [Handwrite / Assign on Print]",
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.brown),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
