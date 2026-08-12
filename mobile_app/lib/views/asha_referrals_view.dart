import 'package:flutter/material.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/screening_place_model.dart';
import '../services/api_service.dart';

class AshaReferralsView extends StatefulWidget {
  final UserModel user;

  const AshaReferralsView({super.key, required this.user});

  @override
  State<AshaReferralsView> createState() => _AshaReferralsViewState();
}

class _AshaReferralsViewState extends State<AshaReferralsView> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();

  List<ScreeningPlaceModel> _camps = [];
  String? _selectedCampCode;
  List<Map<String, dynamic>> _referrals = [];
  bool _loading = true;
  bool _submitting = false;

  // Form Controllers
  final _nameController = TextEditingController();
  final _ageController = TextEditingController(text: "50");
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _phcNameController = TextEditingController();
  final _rbsController = TextEditingController();
  final _symptomsController = TextEditingController(text: "Blurred vision");
  final _notesController = TextEditingController();

  String _gender = "Female";
  String _referrerType = "ophthalmic_officer";
  String _statusFilter = "all";
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    if (widget.user.userType == "asha_worker") {
      _referrerType = "asha_worker";
    } else if (widget.user.userType == "vision_center") {
      _referrerType = "vision_center";
    }
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _ageController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _phcNameController.dispose();
    _rbsController.dispose();
    _symptomsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final camps = await ApiService.fetchScreeningPlaces();
      final referrals = await ApiService.fetchVcReferrals();

      if (mounted) {
        setState(() {
          _camps = camps;
          if (_camps.isNotEmpty && _selectedCampCode == null) {
            _selectedCampCode = _camps.first.shortCode;
          }
          _referrals = referrals;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading referrals: $e'), backgroundColor: AppConstants.dangerRed),
        );
      }
    }
  }

  Future<void> _submitReferral() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCampCode == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a target DR camp'), backgroundColor: AppConstants.dangerRed),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final payload = {
        'patientName': _nameController.text.trim(),
        'age': int.tryParse(_ageController.text.trim()) ?? 45,
        'gender': _gender,
        'phone': _phoneController.text.trim().isEmpty ? 'N/A' : _phoneController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? 'Local Area' : _addressController.text.trim(),
        'village': _addressController.text.trim().isEmpty ? 'Local Area' : _addressController.text.trim(),
        'referrerType': _referrerType,
        'phcName': _phcNameController.text.trim().isEmpty ? null : _phcNameController.text.trim(),
        'randomBloodSugar': _rbsController.text.trim().isEmpty ? null : _rbsController.text.trim(),
        'symptoms': _symptomsController.text.trim().isEmpty ? null : _symptomsController.text.trim(),
        'targetCampCode': _selectedCampCode,
        'drNotes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      };

      await ApiService.createVcReferral(payload);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Referral submitted successfully for ${_nameController.text.trim()}! 📋'),
            backgroundColor: AppConstants.successGreen,
          ),
        );

        // Reset form
        _nameController.clear();
        _ageController.text = "50";
        _phoneController.clear();
        _addressController.clear();
        _phcNameController.clear();
        _rbsController.clear();
        _notesController.clear();

        await _loadData();
        _tabController.animateTo(1); // Switch to list tab
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission failed: $e'), backgroundColor: AppConstants.dangerRed),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Field & ASHA Referrals", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text("Ophthalmic Officers, Vision Centers & ASHA Workers", style: TextStyle(fontSize: 10, color: Colors.white70)),
          ],
        ),
        backgroundColor: AppConstants.primaryOrange,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: [
            const Tab(icon: Icon(Icons.person_add_alt_1_rounded, size: 18), text: "1. Refer Patient"),
            Tab(
              icon: const Icon(Icons.list_alt_rounded, size: 18),
              text: "2. My Referrals (${_referrals.length})",
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppConstants.primaryOrange))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildReferralForm(),
                _buildReferralsList(),
              ],
            ),
    );
  }

  Widget _buildReferralForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Referrer Role Selection Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Referrer Designation / Role *", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _roleChip("ophthalmic_officer", "👁️ Ophthalmic Officer"),
                      const SizedBox(width: 8),
                      _roleChip("asha_worker", "❤️ ASHA Worker"),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _roleChip("vision_center", "🏥 Vision Center / PHC"),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Patient Info Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Patient Demographics", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 12),

                  // Patient Name
                  TextFormField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      labelText: "Patient Full Name *",
                      hintText: "e.g. Parvathamma K",
                      prefixIcon: const Icon(Icons.person_outline, color: AppConstants.primaryOrange),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    validator: (v) => v == null || v.trim().isEmpty ? "Patient name is required" : null,
                  ),
                  const SizedBox(height: 12),

                  // Age & Gender Row
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _ageController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: "Age (Years) *",
                            prefixIcon: const Icon(Icons.cake_outlined, color: AppConstants.primaryOrange),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _gender,
                          decoration: InputDecoration(
                            labelText: "Gender *",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: ["Female", "Male", "Other"].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                          onChanged: (v) => setState(() => _gender = v ?? "Female"),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Mobile Phone & Village
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            labelText: "Mobile Phone",
                            hintText: "10-digit number",
                            prefixIcon: const Icon(Icons.phone_outlined, color: AppConstants.primaryOrange),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _addressController,
                          decoration: InputDecoration(
                            labelText: "Village / Town *",
                            hintText: "e.g. Konandur",
                            prefixIcon: const Icon(Icons.location_on_outlined, color: AppConstants.primaryOrange),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty ? "Village is required" : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Target Camp & Clinical Intake Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Target Camp & Clinical Vitals", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 12),

                  // Target Camp Selector
                  DropdownButtonFormField<String>(
                    value: _selectedCampCode,
                    decoration: InputDecoration(
                      labelText: "Target DR Screening Camp *",
                      prefixIcon: const Icon(Icons.campaign_outlined, color: AppConstants.primaryOrange),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: _camps.map((c) => DropdownMenuItem(
                      value: c.shortCode,
                      child: Text(
                        "${c.name} (${c.shortCode})",
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    )).toList(),
                    onChanged: (v) => setState(() => _selectedCampCode = v),
                    validator: (v) => v == null ? "Select camp" : null,
                  ),
                  const SizedBox(height: 12),

                  // PHC Name & RBS
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _phcNameController,
                          decoration: InputDecoration(
                            labelText: "PHC / CHC Name",
                            hintText: "e.g. Ripponpete PHC",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _rbsController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: "Blood Sugar (mg/dL)",
                            hintText: "e.g. 185",
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Symptoms & Notes
                  TextFormField(
                    controller: _symptomsController,
                    decoration: InputDecoration(
                      labelText: "Reported Symptoms",
                      hintText: "e.g. Blurred vision, floaters",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _notesController,
                    decoration: InputDecoration(
                      labelText: "Clinical Remarks / Doctor Notes",
                      hintText: "e.g. Suspected diabetic macular edema",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Submit Button
            ElevatedButton(
              onPressed: _submitting ? null : _submitReferral,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryOrange,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              child: _submitting
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.send_rounded, size: 18),
                        SizedBox(width: 8),
                        Text("SUBMIT PATIENT REFERRAL", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _roleChip(String value, String label) {
    final active = _referrerType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _referrerType = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
          decoration: BoxDecoration(
            color: active ? AppConstants.primaryOrangeLight : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: active ? AppConstants.primaryOrange : const Color(0xFFCBD5E1), width: active ? 1.5 : 1),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: active ? FontWeight.bold : FontWeight.w600,
              color: active ? AppConstants.primaryOrange : const Color(0xFF475569),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReferralsList() {
    final filtered = _referrals.where((r) {
      final matchesSearch = (r['patientName'] ?? '').toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (r['phone'] ?? '').toString().contains(_searchQuery) ||
          (r['targetCampCode'] ?? '').toString().toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesStatus = _statusFilter == "all" || (r['status'] ?? '') == _statusFilter;
      return matchesSearch && matchesStatus;
    }).toList();

    return Column(
      children: [
        // Search and filter header
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.white,
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: "Search by patient name, phone, camp...",
                  prefixIcon: const Icon(Icons.search, size: 20),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _filterButton("all", "All (${_referrals.length})"),
                  const SizedBox(width: 8),
                  _filterButton("pending", "Pending (${_referrals.where((r) => r['status'] == 'pending').length})"),
                  const SizedBox(width: 8),
                  _filterButton("completed", "Screened ✓ (${_referrals.where((r) => r['status'] == 'completed').length})"),
                ],
              ),
            ],
          ),
        ),

        // List
        Expanded(
          child: filtered.isEmpty
              ? const Center(child: Text("No matching referrals found.", style: TextStyle(color: AppConstants.textMuted)))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: filtered.length,
                  itemBuilder: (context, idx) {
                    final item = filtered[idx];
                    final isScreened = item['status'] == "completed" || item['status'] == "screened";
                    final isAsha = item['referrerType'] == "asha_worker";
                    final isOphthalmic = item['referrerType'] == "ophthalmic_officer";

                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 1,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  item['patientName'] ?? 'Unnamed',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isScreened ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    isScreened ? "Screened ✓" : "Pending Camp",
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isScreened ? const Color(0xFF065F46) : const Color(0xFF92400E),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "${item['age']} yrs • ${item['gender']} • 📞 ${item['phone']}",
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    "Camp: ${item['targetCampCode'] ?? 'N/A'}",
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isOphthalmic ? "By: Ophthalmic Officer" : isAsha ? "By: ASHA Worker" : "By: Vision Center",
                                  style: const TextStyle(fontSize: 10, color: AppConstants.textMuted),
                                ),
                              ],
                            ),
                            if (item['randomBloodSugar'] != null && item['randomBloodSugar'].toString().isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text("RBS: ${item['randomBloodSugar']} mg/dL", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF4338CA))),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _filterButton(String key, String label) {
    final active = _statusFilter == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _statusFilter = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: active ? AppConstants.primaryOrange : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: active ? Colors.white : const Color(0xFF475569),
            ),
          ),
        ),
      ),
    );
  }
}
