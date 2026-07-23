import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/vision_center_model.dart';
import '../services/api_service.dart';

class VisionCentersView extends StatefulWidget {
  final UserModel user;

  const VisionCentersView({super.key, required this.user});

  @override
  State<VisionCentersView> createState() => _VisionCentersViewState();
}

class _VisionCentersViewState extends State<VisionCentersView> {
  List<VisionCenterModel> _centers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchVCs();
  }

  Future<void> _fetchVCs() async {
    setState(() => _isLoading = true);
    try {
      final centers = await ApiService.fetchVisionCenters();
      if (mounted) {
        setState(() {
          _centers = centers;
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
        title: const Text("Vision Centers Network", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _centers.length,
              itemBuilder: (context, index) {
                final vc = _centers[index];
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
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.blue.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                "CODE: ${vc.shortCode}",
                                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.blue),
                              ),
                            ),
                            Text(
                              vc.status.toUpperCase(),
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppConstants.successGreen),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          vc.name,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          "📍 ${vc.taluk != null ? '${vc.taluk}, ' : ''}${vc.district}, ${vc.state}",
                          style: const TextStyle(fontSize: 11, color: AppConstants.textMuted),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          "Base Unit: ${vc.sankaraUnit}",
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
                        ),
                        if (vc.phone != null) ...[
                          const SizedBox(height: 4),
                          Text("📞 Phone: ${vc.phone}", style: const TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.bold)),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
