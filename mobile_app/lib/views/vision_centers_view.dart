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

  bool get _canManage => widget.user.userType == 'super_admin' || widget.user.userType == 'admin' || widget.user.userType == 'admin_unit';

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

  void _showVcDialog({VisionCenterModel? vc}) {
    final isEdit = vc != null;
    final codeController = TextEditingController(text: vc?.shortCode ?? '');
    final nameController = TextEditingController(text: vc?.name ?? '');
    final talukController = TextEditingController(text: vc?.taluk ?? 'Chitradurga');
    final districtController = TextEditingController(text: vc?.district ?? 'Chitradurga');
    final stateController = TextEditingController(text: vc?.state ?? 'Karnataka');
    final pincodeController = TextEditingController(text: vc?.pincode ?? '577501');
    final phoneController = TextEditingController(text: vc?.phone ?? '');
    final addressController = TextEditingController(text: vc?.address ?? '');
    String status = vc?.status ?? 'active';
    String sankaraUnit = vc?.sankaraUnit ?? widget.user.assignedTrack ?? 'Sankara Eye Hospital Shimoga';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isEdit ? "Edit Vision Center" : "Create New Vision Center",
          style: const TextStyle(fontWeight: FontWeight.w900, color: AppConstants.navyDark),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: codeController,
                readOnly: isEdit,
                decoration: const InputDecoration(
                  labelText: "VC Code * (e.g. VC001)",
                  hintText: "VC001",
                  prefixIcon: Icon(Icons.business),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: "Vision Center Name *",
                  hintText: "Chitradurga Vision Center",
                  prefixIcon: Icon(Icons.location_city),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: talukController,
                decoration: const InputDecoration(
                  labelText: "Taluk / Sub-District",
                  hintText: "Chitradurga",
                  prefixIcon: Icon(Icons.map),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: districtController,
                decoration: const InputDecoration(
                  labelText: "District",
                  hintText: "Chitradurga",
                  prefixIcon: Icon(Icons.apartment),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: pincodeController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: "Pincode",
                  hintText: "577501",
                  prefixIcon: Icon(Icons.pin_drop),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Phone / Contact",
                  hintText: "08194 220011",
                  prefixIcon: Icon(Icons.phone),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              if (codeController.text.trim().isEmpty || nameController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('VC Code and Name are required')),
                );
                return;
              }

              final payload = {
                'shortCode': codeController.text.trim().toUpperCase(),
                'name': nameController.text.trim(),
                'taluk': talukController.text.trim(),
                'district': districtController.text.trim(),
                'state': stateController.text.trim(),
                'pincode': pincodeController.text.trim(),
                'phone': phoneController.text.trim(),
                'address': addressController.text.trim(),
                'sankaraUnit': sankaraUnit,
                'status': status,
              };

              Navigator.pop(context);
              setState(() => _isLoading = true);

              try {
                if (isEdit) {
                  await ApiService.updateVisionCenter(vc.id, payload);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Vision Center updated!')),
                  );
                } else {
                  await ApiService.createVisionCenter(payload);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('New Vision Center created!')),
                  );
                }
                _fetchVCs();
              } catch (e) {
                setState(() => _isLoading = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed: $e')),
                );
              }
            },
            child: Text(isEdit ? "Save Changes" : "Create VC"),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteVC(VisionCenterModel vc) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Vision Center?"),
        content: Text("Are you sure you want to delete ${vc.name} (${vc.shortCode})?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppConstants.dangerRed),
            onPressed: () async {
              Navigator.pop(context);
              setState(() => _isLoading = true);
              try {
                await ApiService.deleteVisionCenter(vc.id);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Vision Center deleted')),
                );
                _fetchVCs();
              } catch (e) {
                setState(() => _isLoading = false);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Failed: $e')),
                );
              }
            },
            child: const Text("Delete", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: AppConstants.navyDark,
        title: const Text("Vision Centers Network", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Colors.white), onPressed: _fetchVCs),
        ],
      ),
      floatingActionButton: _canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showVcDialog(),
              backgroundColor: AppConstants.primaryOrange,
              icon: const Icon(Icons.add_business, color: Colors.white),
              label: const Text("ADD VC", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            )
          : null,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchVCs,
              child: ListView.builder(
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
                                  color: Colors.blue.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  "CODE: ${vc.shortCode}",
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.blue),
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    vc.status.toUpperCase(),
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppConstants.successGreen),
                                  ),
                                  if (_canManage) ...[
                                    const SizedBox(width: 8),
                                    IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: EdgeInsets.zero,
                                      icon: const Icon(Icons.edit, color: Colors.blue, size: 18),
                                      onPressed: () => _showVcDialog(vc: vc),
                                    ),
                                    const SizedBox(width: 4),
                                    IconButton(
                                      constraints: const BoxConstraints(),
                                      padding: EdgeInsets.zero,
                                      icon: const Icon(Icons.delete_outline, color: AppConstants.dangerRed, size: 18),
                                      onPressed: () => _confirmDeleteVC(vc),
                                    ),
                                  ],
                                ],
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
                            "📍 ${vc.taluk != null ? '${vc.taluk}, ' : ''}${vc.district}, ${vc.state} (${vc.pincode ?? ''})",
                            style: const TextStyle(fontSize: 11, color: AppConstants.textMuted),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "Base Unit: ${vc.sankaraUnit}",
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
