import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/screening_place_model.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class CampsManagementView extends StatefulWidget {
  final UserModel user;

  const CampsManagementView({super.key, required this.user});

  @override
  State<CampsManagementView> createState() => _CampsManagementViewState();
}

class _CampsManagementViewState extends State<CampsManagementView> {
  List<ScreeningPlaceModel> _places = [];
  List<ScreeningPlaceModel> _filteredPlaces = [];
  bool _isLoading = true;
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _loadCamps();
  }

  Future<void> _loadCamps() async {
    setState(() => _isLoading = true);
    try {
      final places = await ApiService.fetchScreeningPlaces();
      if (mounted) {
        setState(() {
          _places = places;
          _applyFilter();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading camps: $e')),
        );
      }
    }
  }

  void _applyFilter() {
    if (_searchQuery.trim().isEmpty) {
      _filteredPlaces = List.from(_places);
    } else {
      final query = _searchQuery.toLowerCase();
      _filteredPlaces = _places.where((p) {
        final code = p.shortCode.toLowerCase();
        final name = p.name.toLowerCase();
        final district = p.district.toLowerCase();
        final taluk = (p.taluk ?? '').toLowerCase();
        final pincode = (p.pincode ?? '').toLowerCase();
        return code.contains(query) || name.contains(query) || district.contains(query) || taluk.contains(query) || pincode.contains(query);
      }).toList();
    }
  }

  bool get _canManage => widget.user.userType == 'super_admin' || widget.user.userType == 'admin' || widget.user.userType == 'admin_unit';

  void _showCampDialog({ScreeningPlaceModel? camp}) {
    final isEdit = camp != null;
    final codeController = TextEditingController(text: camp?.shortCode ?? '');
    final nameController = TextEditingController(text: camp?.name ?? '');
    final talukController = TextEditingController(text: camp?.taluk ?? 'Shimoga Rural');
    final districtController = TextEditingController(text: camp?.district ?? 'Shivamogga');
    final stateController = TextEditingController(text: camp?.state ?? 'Karnataka');
    final pincodeController = TextEditingController(text: camp?.pincode ?? '577211');
    final dateController = TextEditingController(text: camp?.campDate ?? DateTime.now().toString().split(' ')[0]);
    final mapLinkController = TextEditingController(text: camp?.mapLink ?? '');
    String status = camp?.status ?? 'active';
    String sankaraUnit = camp?.sankaraUnit ?? widget.user.assignedTrack ?? 'Sankara Eye Hospital Shimoga';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isEdit ? "Edit Screening Camp" : "Create New Screening Camp",
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
                  labelText: "Camp Short Code * (e.g. AYN01)",
                  hintText: "AYN01",
                  prefixIcon: Icon(Icons.qr_code),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: "Camp / Village Name *",
                  hintText: "Ayanur Camp",
                  prefixIcon: Icon(Icons.location_city),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: dateController,
                decoration: const InputDecoration(
                  labelText: "Date of Camp * (YYYY-MM-DD)",
                  hintText: "2026-08-15",
                  prefixIcon: Icon(Icons.calendar_month),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: talukController,
                decoration: const InputDecoration(
                  labelText: "Taluk / Sub-District",
                  hintText: "Shimoga Rural",
                  prefixIcon: Icon(Icons.map),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: pincodeController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: "Pincode",
                  hintText: "577211",
                  prefixIcon: Icon(Icons.pin_drop),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: districtController,
                decoration: const InputDecoration(
                  labelText: "District",
                  hintText: "Shivamogga",
                  prefixIcon: Icon(Icons.apartment),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: mapLinkController,
                decoration: const InputDecoration(
                  labelText: "Google Maps Link / GPS Coordinates",
                  hintText: "13.6958, 75.8234",
                  prefixIcon: Icon(Icons.link),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: status,
                decoration: const InputDecoration(labelText: "Camp Status"),
                items: const [
                  DropdownMenuItem(value: "active", child: Text("Active (Planned)")),
                  DropdownMenuItem(value: "completed", child: Text("Completed")),
                ],
                onChanged: (val) => status = val ?? 'active',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              if (codeController.text.trim().isEmpty || nameController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Camp Short Code and Name are required.')),
                );
                return;
              }

              final payload = {
                'shortCode': codeController.text.trim().toUpperCase(),
                'name': nameController.text.trim(),
                'campDate': dateController.text.trim(),
                'taluk': talukController.text.trim(),
                'district': districtController.text.trim(),
                'state': stateController.text.trim(),
                'pincode': pincodeController.text.trim(),
                'sankaraUnit': sankaraUnit,
                'status': status,
                'mapLink': mapLinkController.text.trim(),
              };

              Navigator.pop(context);
              setState(() => _isLoading = true);

              try {
                if (isEdit) {
                  await ApiService.updateScreeningPlace(camp.id, payload);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Camp details updated successfully!')),
                    );
                  }
                } else {
                  await ApiService.createScreeningPlace(payload);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('New screening camp created!')),
                    );
                  }
                }
                _loadCamps();
              } catch (err) {
                if (mounted) {
                  setState(() => _isLoading = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Failed: $err')),
                  );
                }
              }
            },
            child: Text(isEdit ? "Save Changes" : "Create Camp"),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteCamp(ScreeningPlaceModel camp) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Delete Camp?"),
        content: Text("Are you sure you want to delete ${camp.name} (${camp.shortCode})? This action cannot be undone."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppConstants.dangerRed),
            onPressed: () async {
              Navigator.pop(context);
              setState(() => _isLoading = true);
              try {
                await ApiService.deleteScreeningPlace(camp.id);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Camp deleted successfully')),
                  );
                }
                _loadCamps();
              } catch (e) {
                if (mounted) {
                  setState(() => _isLoading = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Delete failed: $e')),
                  );
                }
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
        title: const Text("Screening Camps", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadCamps,
          ),
        ],
      ),
      floatingActionButton: _canManage
          ? FloatingActionButton.extended(
              onPressed: () => _showCampDialog(),
              backgroundColor: AppConstants.primaryOrange,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text("CREATE CAMP", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            )
          : null,
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                  _applyFilter();
                });
              },
              decoration: InputDecoration(
                hintText: "Search by Village, Code, Pincode, Taluk...",
                prefixIcon: const Icon(Icons.search, color: AppConstants.primaryOrange),
                filled: true,
                fillColor: AppConstants.backgroundLight,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // Camps Directory List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredPlaces.isEmpty
                    ? const Center(
                        child: Text(
                          "No screening camps found.",
                          style: TextStyle(color: AppConstants.textMuted, fontWeight: FontWeight.bold),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadCamps,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _filteredPlaces.length,
                          itemBuilder: (context, index) {
                            final camp = _filteredPlaces[index];
                            final isActive = camp.status == 'active';

                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              elevation: 1,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              child: ListTile(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                leading: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: isActive ? AppConstants.primaryOrange.withValues(alpha: 0.1) : Colors.green.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.location_on,
                                    color: isActive ? AppConstants.primaryOrange : Colors.green,
                                    size: 24,
                                  ),
                                ),
                                title: Row(
                                  children: [
                                    Text(
                                      camp.shortCode,
                                      style: const TextStyle(fontWeight: FontWeight.w900, color: AppConstants.navyDark),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isActive ? AppConstants.primaryOrange.withValues(alpha: 0.15) : Colors.green.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        camp.status.toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: isActive ? AppConstants.primaryOrange : Colors.green,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 2),
                                    Text(
                                      camp.name,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                                    ),
                                    Text(
                                      "Taluk: ${camp.taluk ?? 'Shimoga Rural'} • Pincode: ${camp.pincode ?? '577211'}",
                                      style: const TextStyle(fontSize: 11, color: AppConstants.textMuted),
                                    ),
                                    if (camp.campDate != null && camp.campDate!.isNotEmpty)
                                      Text(
                                        "📅 Date: ${camp.campDate}",
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppConstants.navyDark),
                                      ),
                                  ],
                                ),
                                trailing: _canManage
                                    ? Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.edit, color: Colors.blue, size: 20),
                                            onPressed: () => _showCampDialog(camp: camp),
                                            tooltip: "Edit Camp",
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, color: AppConstants.dangerRed, size: 20),
                                            onPressed: () => _confirmDeleteCamp(camp),
                                            tooltip: "Delete Camp",
                                          ),
                                        ],
                                      )
                                    : null,
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
