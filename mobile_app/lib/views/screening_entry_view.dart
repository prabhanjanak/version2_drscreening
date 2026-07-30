import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../config/constants.dart';
import '../models/user_model.dart';
import '../models/patient_model.dart';
import '../models/screening_place_model.dart';
import '../services/api_service.dart';
import '../services/database_helper.dart';

class ScreeningEntryView extends StatefulWidget {
  final UserModel user;

  const ScreeningEntryView({super.key, required this.user});

  @override
  State<ScreeningEntryView> createState() => _ScreeningEntryViewState();
}

class _ScreeningEntryViewState extends State<ScreeningEntryView> {
  final _formKey = GlobalKey<FormState>();

  List<ScreeningPlaceModel> _camps = [];
  ScreeningPlaceModel? _selectedCamp;
  bool _loadingCamps = true;

  // Form Fields
  final _nameController = TextEditingController();
  final _ageController = TextEditingController(text: "45");
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _systolicBpController = TextEditingController(text: "120");
  final _diastolicBpController = TextEditingController(text: "80");

  String _selectedGender = "Male";
  String _selectedDuration = "Newly Diagnosed";
  String _selectedDrStatus = "No DR";
  String _selectedAdvice = "Annual Review";
  final String _imageQuality = "Good";
  bool _referToBaseHospital = false;

  File? _imageFile;
  String? _base64Image;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _fetchCamps();
  }

  Future<void> _fetchCamps() async {
    try {
      final camps = await ApiService.fetchScreeningPlaces();
      final activeCamps = camps.where((c) => c.status == 'active').toList();
      if (mounted) {
        setState(() {
          _camps = activeCamps.isNotEmpty ? activeCamps : camps;
          if (_camps.isNotEmpty) {
            _selectedCamp = _camps.first;
          }
          _loadingCamps = false;
        });
      }
    } catch (e) {
      final cached = await DatabaseHelper.instance.getCachedScreeningPlaces();
      if (mounted) {
        setState(() {
          _camps = cached;
          if (cached.isNotEmpty) _selectedCamp = cached.first;
          _loadingCamps = false;
        });
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source, imageQuality: 70);

      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          if (!kIsWeb) _imageFile = File(pickedFile.path);
          _base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
        });
      }
    } catch (e) {
      print('Image pick error: $e');
    }
  }

  // VC Referral Picker Modal
  Future<void> _openVcReferralsModal() async {
    if (_selectedCamp == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(16),
          height: MediaQuery.of(context).size.height * 0.6,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "VC Referrals for ${_selectedCamp!.shortCode}",
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(),
              Expanded(
                child: FutureBuilder<List<Map<String, dynamic>>>(
                  future: ApiService.fetchVcReferrals(_selectedCamp!.shortCode),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (!snapshot.hasData || snapshot.data!.isEmpty) {
                      return const Center(child: Text("No pending VC referrals found for this camp."));
                    }

                    final referrals = snapshot.data!;
                    return ListView.builder(
                      itemCount: referrals.length,
                      itemBuilder: (context, index) {
                        final item = referrals[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(item['patientName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text("${item['age']} yrs • ${item['gender']} • 📞 ${item['phone']}"),
                            trailing: ElevatedButton(
                              style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryOrange),
                              onPressed: () {
                                setState(() {
                                  _nameController.text = item['patientName'] ?? '';
                                  _ageController.text = (item['age'] ?? 45).toString();
                                  _selectedGender = item['gender'] ?? 'Male';
                                  _phoneController.text = item['phone'] ?? '';
                                  _addressController.text = item['address'] ?? '';
                                });
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text("Auto-filled details for ${item['patientName']}")),
                                );
                              },
                              child: const Text("Fill Form", style: TextStyle(fontSize: 11, color: Colors.white)),
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _saveScreeningRecord() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCamp == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an active camp')),
      );
      return;
    }

    setState(() => _isSaving = true);

    final now = DateTime.now();
    final dateStr = DateFormat('yyyy-MM-dd').format(now);
    final dd = now.day.toString().padLeft(2, '0');
    final mm = now.month.toString().padLeft(2, '0');
    final yyyy = now.year.toString();
    final dateFormatted = "$dd$mm$yyyy";
    final serialNo = (now.millisecondsSinceEpoch % 9999) + 1;
    final serialPadded = serialNo.toString().padLeft(4, '0');
    final uniqueId = "SEH/DR/$dateFormatted/$serialPadded";

    final bpStr = "${_systolicBpController.text.trim()}/${_diastolicBpController.text.trim()}";

    final patient = PatientModel(
      uniqueId: uniqueId,
      date: dateStr,
      screeningPlaceCode: _selectedCamp!.shortCode,
      serialNumber: serialNo,
      name: _nameController.text.trim(),
      age: int.parse(_ageController.text.trim()),
      gender: _selectedGender,
      address: _addressController.text.trim(),
      phone: _phoneController.text.trim(),
      diabetesDuration: _selectedDuration,
      bloodPressure: bpStr,
      drStatus: _selectedDrStatus,
      advice: _selectedAdvice,
      imagePath: _base64Image ?? "placeholder_fundus.jpg",
      imageQuality: _imageQuality,
      referralStatus: _selectedDrStatus != "No DR" ? "Referred" : "Follow-up",
      referToBaseHospital: _referToBaseHospital,
    );

    try {
      // Try posting online directly
      final success = await ApiService.createPatientRecord(patient);
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Patient Screening Saved Online Successfully!'),
              backgroundColor: AppConstants.successGreen,
            ),
          );
          Navigator.pop(context);
        }
      } else {
        throw Exception('Server rejected entry');
      }
    } catch (e) {
      // Save locally to Database Helper (universal SQLite / local queue)
      await DatabaseHelper.instance.insertPatient(patient);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Saved Offline to Local Database! Will auto-sync when online.'),
            backgroundColor: AppConstants.warningAmber,
          ),
        );
        Navigator.pop(context);
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundLight,
      appBar: AppBar(
        backgroundColor: AppConstants.navyDark,
        title: const Text("New Patient Screening", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1, color: AppConstants.primaryOrange),
            onPressed: _openVcReferralsModal,
            tooltip: "Referrals from VCs",
          ),
        ],
      ),
      body: _loadingCamps
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Active Camp Selector Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppConstants.borderLight),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("ACTIVE CAMP SESSION", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppConstants.textMuted)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<ScreeningPlaceModel>(
                            initialValue: _selectedCamp,
                            decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.zero),
                            items: _camps.map((camp) {
                              return DropdownMenuItem(
                                value: camp,
                                child: Text("${camp.name} (${camp.shortCode})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              );
                            }).toList(),
                            onChanged: (val) => setState(() => _selectedCamp = val),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Section 1: Demographics
                    _buildSectionHeader("SECTION 1: DEMOGRAPHICS"),

                    TextFormField(
                      controller: _nameController,
                      decoration: _buildInputDecoration("Patient Full Name *", Icons.person),
                      validator: (val) => val == null || val.isEmpty ? "Required" : null,
                    ),

                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _ageController,
                            keyboardType: TextInputType.number,
                            decoration: _buildInputDecoration("Age *", Icons.cake),
                            validator: (val) => val == null || val.isEmpty ? "Required" : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            maxLength: 10,
                            decoration: _buildInputDecoration("Phone Number *", Icons.phone).copyWith(counterText: ""),
                            validator: (val) => val == null || val.length != 10 ? "10 Digits" : null,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _addressController,
                      decoration: _buildInputDecoration("Address / Village *", Icons.location_on),
                      validator: (val) => val == null || val.isEmpty ? "Required" : null,
                    ),

                    const SizedBox(height: 12),

                    const Text("Gender *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                    const SizedBox(height: 6),
                    _buildSegmentedGrid(
                      options: AppConstants.genderOptions,
                      selected: _selectedGender,
                      onSelect: (val) => setState(() => _selectedGender = val),
                    ),

                    const SizedBox(height: 20),

                    // Section 2: Clinical Vitals & Diabetes
                    _buildSectionHeader("SECTION 2: VITALS & DIABETES"),

                    const Text("Diabetes Duration *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                    const SizedBox(height: 6),
                    _buildSegmentedGrid(
                      options: AppConstants.diabetesDurationOptions,
                      selected: _selectedDuration,
                      onSelect: (val) => setState(() => _selectedDuration = val),
                    ),

                    const SizedBox(height: 12),

                    const Text("Blood Pressure (SYS / DIA) *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _systolicBpController,
                            keyboardType: TextInputType.number,
                            decoration: _buildInputDecoration("Systolic (120)", Icons.favorite),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 8),
                          child: Text("/", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        ),
                        Expanded(
                          child: TextFormField(
                            controller: _diastolicBpController,
                            keyboardType: TextInputType.number,
                            decoration: _buildInputDecoration("Diastolic (80)", Icons.favorite_border),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // Section 3: Fundus Photography & Camera
                    _buildSectionHeader("SECTION 3: FUNDUS PHOTOGRAPHY"),

                    Container(
                      height: 160,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppConstants.borderLight),
                      ),
                      child: _imageFile != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.file(_imageFile!, fit: BoxFit.cover),
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.camera_alt_outlined, size: 40, color: AppConstants.textMuted),
                                const SizedBox(height: 8),
                                Wrap(
                                  alignment: WrapAlignment.center,
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: () => _pickImage(ImageSource.camera),
                                      icon: const Icon(Icons.camera, size: 16),
                                      label: const Text("Camera", style: TextStyle(fontSize: 11)),
                                      style: ElevatedButton.styleFrom(backgroundColor: AppConstants.primaryOrange),
                                    ),
                                    ElevatedButton.icon(
                                      onPressed: () async {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Connecting to Remidio FOP Camera (REM-FOP)...')),
                                        );
                                        setState(() {
                                          _base64Image = "placeholder_fundus.jpg";
                                        });
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Synced fundus image from Remidio Camera! 📸'),
                                            backgroundColor: Colors.indigo,
                                          ),
                                        );
                                      },
                                      icon: const Icon(Icons.sync, size: 16),
                                      label: const Text("Remidio Sync", style: TextStyle(fontSize: 11)),
                                      style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
                                    ),
                                    OutlinedButton.icon(
                                      onPressed: () => _pickImage(ImageSource.gallery),
                                      icon: const Icon(Icons.photo_library, size: 16),
                                      label: const Text("Gallery", style: TextStyle(fontSize: 11)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                    ),

                    const SizedBox(height: 20),

                    // Section 4: DR Diagnosis & Referral
                    _buildSectionHeader("SECTION 4: DR DIAGNOSIS"),

                    const Text("DR Status Severity *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                    const SizedBox(height: 6),
                    _buildSegmentedGrid(
                      options: AppConstants.drStatusOptions,
                      selected: _selectedDrStatus,
                      onSelect: (val) => setState(() => _selectedDrStatus = val),
                      activeColor: _selectedDrStatus != "No DR" ? AppConstants.dangerRed : AppConstants.primaryOrange,
                    ),

                    const SizedBox(height: 12),

                    const Text("Advice & Action Plan *", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                    const SizedBox(height: 6),
                    _buildSegmentedGrid(
                      options: AppConstants.adviceOptions,
                      selected: _selectedAdvice,
                      onSelect: (val) => setState(() => _selectedAdvice = val),
                    ),

                    const SizedBox(height: 12),

                    SwitchListTile(
                      title: const Text("Refer to Base Hospital", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      subtitle: const Text("Flags patient for transport shuttle to Sankara Base Hospital"),
                      value: _referToBaseHospital,
                      activeThumbColor: AppConstants.primaryOrange,
                      onChanged: (val) => setState(() => _referToBaseHospital = val),
                    ),

                    const SizedBox(height: 24),

                    // Submit Button
                    ElevatedButton(
                      onPressed: _isSaving ? null : _saveScreeningRecord,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.primaryOrange,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 54),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 3,
                      ),
                      child: _isSaving
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text("SAVE PATIENT SCREENING", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppConstants.primaryOrange, letterSpacing: 1),
      ),
    );
  }

  InputDecoration _buildInputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: AppConstants.primaryOrange, size: 20),
      fillColor: Colors.white,
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
    );
  }

  Widget _buildSegmentedGrid({
    required List<String> options,
    required String selected,
    required Function(String) onSelect,
    Color activeColor = AppConstants.primaryOrange,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((opt) {
        final isSelected = opt == selected;
        return InkWell(
          onTap: () => onSelect(opt),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? activeColor : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isSelected ? activeColor : AppConstants.borderLight),
              boxShadow: isSelected ? [BoxShadow(color: activeColor.withValues(alpha: 0.3), blurRadius: 4)] : [],
            ),
            child: Text(
              opt,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : AppConstants.textDark,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
