import 'dart:convert';
import 'dart:io';
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

  // Pre-Referrals for Active Camp
  List<Map<String, dynamic>> _campReferrals = [];
  int? _appliedReferralId;
  String? _appliedReferralPatientName;

  // Form Fields - Station 1: Demographics & Source
  final _nameController = TextEditingController();
  final _ageController = TextEditingController(text: "45");
  final _phoneController = TextEditingController();
  final _alternatePhoneController = TextEditingController();
  final _addressController = TextEditingController();
  String _selectedGender = "Male";
  String _selectedReferralSource = "ASHA Worker / ANM Outreach";
  bool _referredToGiftOfVision = false;
  String? _selectedGovtScheme;

  // Station 2: Diabetes & Vitals
  String _selectedDuration = "Newly Diagnosed";
  String _selectedMeasureType = "GRBS (mg/dL)";
  final _glucoseValueController = TextEditingController();
  String _selectedRecordedBy = "CHC / PHC Staff";
  final _chcPhcCenterController = TextEditingController();
  final _systolicBpController = TextEditingController();
  final _diastolicBpController = TextEditingController();

  // Station 3: Eye Assessment & Fundus
  bool _fundusCaptured = true;
  String _fundusNotCapturedReason = "Pupil not dilated";
  String _selectedCataract = "None";
  String? _selectedCataractPlanning;
  String _selectedDrStatus = "No DR";
  String _selectedAdvice = "Annual Review";
  final String _imageQuality = "Good";
  bool _referToBaseHospital = false;
  final _baseHospitalRemarksController = TextEditingController();
  final _remarksController = TextEditingController();

  File? _imageFile;
  String? _base64Image;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _fetchCamps();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _phoneController.dispose();
    _alternatePhoneController.dispose();
    _addressController.dispose();
    _glucoseValueController.dispose();
    _chcPhcCenterController.dispose();
    _systolicBpController.dispose();
    _diastolicBpController.dispose();
    _baseHospitalRemarksController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _fetchCamps() async {
    try {
      final camps = await ApiService.fetchScreeningPlaces();
      if (mounted) {
        setState(() {
          _camps = camps;
          if (_camps.isNotEmpty) {
            final active = _camps.where((c) => c.status == 'active').toList();
            _selectedCamp = active.isNotEmpty ? active.first : _camps.first;
            _fetchCampReferrals();
          }
          _loadingCamps = false;
        });
      }
    } catch (e) {
      final cached = await DatabaseHelper.instance.getCachedScreeningPlaces();
      if (mounted) {
        setState(() {
          _camps = cached;
          if (cached.isNotEmpty) {
            final active = cached.where((c) => c.status == 'active').toList();
            _selectedCamp = active.isNotEmpty ? active.first : cached.first;
            _fetchCampReferrals();
          }
          _loadingCamps = false;
        });
      }
    }
  }

  Future<void> _fetchCampReferrals() async {
    if (_selectedCamp == null) return;
    try {
      final refs = await ApiService.fetchVcReferrals(
        targetCampCode: _selectedCamp!.shortCode,
        status: "pending",
      );
      if (mounted) {
        setState(() {
          _campReferrals = refs;
        });
      }
    } catch (e) {
      debugPrint("Error loading pre-referrals: $e");
    }
  }

  void _applyReferral(Map<String, dynamic> ref) {
    setState(() {
      _appliedReferralId = ref['id'];
      _appliedReferralPatientName = ref['patientName'];

      _nameController.text = ref['patientName'] ?? '';
      _ageController.text = (ref['age'] ?? '45').toString();
      _selectedGender = ref['gender'] ?? 'Male';
      _phoneController.text = (ref['phone'] == 'N/A' ? '' : ref['phone']) ?? '';
      _addressController.text = (ref['address'] ?? ref['village'] ?? '').toString();

      if (ref['randomBloodSugar'] != null && ref['randomBloodSugar'].toString().isNotEmpty) {
        _glucoseValueController.text = ref['randomBloodSugar'].toString();
        _selectedMeasureType = "GRBS (mg/dL)";
      }

      if (ref['phcName'] != null && ref['phcName'].toString().isNotEmpty) {
        _chcPhcCenterController.text = ref['phcName'].toString();
        _selectedRecordedBy = "CHC / PHC Staff";
      }

      final referrerType = ref['referrerType'] ?? '';
      if (referrerType == 'asha_worker') {
        _selectedReferralSource = "ASHA Worker / ANM Outreach";
      } else if (referrerType == 'ophthalmic_officer') {
        _selectedReferralSource = "Doctor / Hospital Referral";
      } else {
        _selectedReferralSource = "Vision Center / PHC / CHC";
      }

      final notes = [
        if (ref['symptoms'] != null && ref['symptoms'].toString().isNotEmpty) "Symptoms: ${ref['symptoms']}",
        if (ref['drNotes'] != null && ref['drNotes'].toString().isNotEmpty) "Notes: ${ref['drNotes']}",
      ].join(" | ");

      if (notes.isNotEmpty) {
        _remarksController.text = notes;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Auto-filled from pre-referral: ${ref['patientName']} ✓"),
        backgroundColor: AppConstants.successGreen,
      ),
    );
  }

  void _unlinkReferral() {
    setState(() {
      _appliedReferralId = null;
      _appliedReferralPatientName = null;
      _nameController.clear();
      _phoneController.clear();
      _addressController.clear();
      _glucoseValueController.clear();
      _remarksController.clear();
    });
  }

  void _openReferralsSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(16),
          height: MediaQuery.of(context).size.height * 0.7,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Pre-Referred Camp Patients",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        "Camp: ${_selectedCamp?.name} (${_selectedCamp?.shortCode})",
                        style: const TextStyle(fontSize: 11, color: AppConstants.textMuted),
                      ),
                    ],
                  ),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const Divider(),
              Expanded(
                child: _campReferrals.isEmpty
                    ? const Center(
                        child: Text(
                          "No pending referrals found for this camp.",
                          style: TextStyle(color: AppConstants.textMuted, fontSize: 12),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _campReferrals.length,
                        itemBuilder: (context, index) {
                          final item = _campReferrals[index];
                          final isAsha = item['referrerType'] == 'asha_worker';
                          final isOphthalmic = item['referrerType'] == 'ophthalmic_officer';

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              item['patientName'] ?? 'Unnamed',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                            const SizedBox(width: 6),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: isOphthalmic
                                                    ? const Color(0xFFFEF3C7)
                                                    : isAsha
                                                        ? const Color(0xFFFFE4E6)
                                                        : const Color(0xFFE0E7FF),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                isOphthalmic ? "Ophthalmic" : isAsha ? "ASHA" : "Vision Center",
                                                style: TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                  color: isOphthalmic
                                                      ? const Color(0xFF92400E)
                                                      : isAsha
                                                          ? const Color(0xFF9F1239)
                                                          : const Color(0xFF3730A3),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          "${item['age']} yrs • ${item['gender']} • 📞 ${item['phone']}",
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                        if (item['randomBloodSugar'] != null)
                                          Text(
                                            "RBS: ${item['randomBloodSugar']} mg/dL",
                                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF4338CA)),
                                          ),
                                      ],
                                    ),
                                  ),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppConstants.primaryOrange,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      minimumSize: const Size(60, 32),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    onPressed: () {
                                      Navigator.pop(context);
                                      _applyReferral(item);
                                    },
                                    child: const Text("Auto-Fill", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            ),
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

  void _openCampSelectorSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(16),
          height: MediaQuery.of(context).size.height * 0.7,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Select Active Screening Camp", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppConstants.navyDark)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const Divider(),
              Expanded(
                child: ListView.builder(
                  itemCount: _camps.length,
                  itemBuilder: (context, index) {
                    final camp = _camps[index];
                    final isSelected = _selectedCamp?.id == camp.id;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      color: isSelected ? AppConstants.primaryOrange.withValues(alpha: 0.1) : Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(color: isSelected ? AppConstants.primaryOrange : AppConstants.borderLight),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isSelected ? AppConstants.primaryOrange : AppConstants.primaryOrangeLight,
                          child: Text(camp.shortCode, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isSelected ? Colors.white : AppConstants.primaryOrange)),
                        ),
                        title: Text(camp.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text("${camp.taluk}, ${camp.district} • ${camp.campDate}"),
                        trailing: isSelected ? const Icon(Icons.check_circle, color: AppConstants.primaryOrange) : null,
                        onTap: () {
                          setState(() {
                            _selectedCamp = camp;
                          });
                          Navigator.pop(context);
                          _fetchCampReferrals();
                        },
                      ),
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

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source, imageQuality: 85);

    if (pickedFile != null) {
      final bytes = await pickedFile.readAsBytes();
      setState(() {
        _imageFile = File(pickedFile.path);
        _base64Image = "data:image/jpeg;base64,${base64Encode(bytes)}";
      });
    }
  }

  Future<void> _handleSaveScreening() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCamp == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an active screening camp'), backgroundColor: AppConstants.dangerRed),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final now = DateTime.now();
      final dateStr = DateFormat('yyyy-MM-dd').format(now);
      final count = await DatabaseHelper.instance.getTodayPatientCountByCamp(dateStr, _selectedCamp!.shortCode);
      final serial = count + 1;
      final uniqueId = "${_selectedCamp!.shortCode}-$serial";

      final bp = (_systolicBpController.text.isNotEmpty && _diastolicBpController.text.isNotEmpty)
          ? "${_systolicBpController.text.trim()}/${_diastolicBpController.text.trim()}"
          : null;

      final patient = PatientModel(
        uniqueId: uniqueId,
        date: dateStr,
        screeningPlaceCode: _selectedCamp!.shortCode,
        serialNumber: serial,
        name: _nameController.text.trim(),
        age: int.parse(_ageController.text.trim()),
        gender: _selectedGender,
        address: _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        phone: _phoneController.text.trim().isEmpty ? 'N/A' : _phoneController.text.trim(),
        alternatePhone: _alternatePhoneController.text.trim().isEmpty ? null : _alternatePhoneController.text.trim(),
        referralSource: _selectedReferralSource,
        diabetesDuration: _selectedDuration,
        diabetesMeasureType: _selectedMeasureType,
        diabetesMeasureValue: _glucoseValueController.text.trim().isEmpty ? null : _glucoseValueController.text.trim(),
        grbsRecordedBy: _selectedRecordedBy,
        chcPhcCenterName: _chcPhcCenterController.text.trim().isEmpty ? null : _chcPhcCenterController.text.trim(),
        bloodPressure: bp,
        drStatus: _selectedDrStatus,
        hasCataract: _selectedCataract,
        cataractPlanning: _selectedCataractPlanning,
        fundusCaptured: _fundusCaptured,
        fundusNotCapturedReason: _fundusCaptured ? null : _fundusNotCapturedReason,
        advice: _selectedAdvice,
        imagePath: _base64Image ?? '',
        imageQuality: _imageQuality,
        referralStatus: "Referred",
        referToBaseHospital: _referToBaseHospital,
        baseHospitalRemarks: _baseHospitalRemarksController.text.trim().isEmpty ? null : _baseHospitalRemarksController.text.trim(),
        remarks: _remarksController.text.trim().isEmpty ? null : _remarksController.text.trim(),
        referredToGiftOfVision: _referredToGiftOfVision,
        govtSchemes: _selectedGovtScheme,
        isSynced: false,
      );

      // Save locally to SQLite first
      await DatabaseHelper.instance.insertPatient(patient);

      // Attempt live sync
      try {
        final serverRes = await ApiService.submitPatientScreening(patient);
        if (serverRes['id'] != null) {
          // If pre-referral was applied, mark referral as completed
          if (_appliedReferralId != null) {
            await ApiService.convertVcReferral(_appliedReferralId!, patientId: serverRes['id']);
          }
        }
      } catch (liveErr) {
        debugPrint("Saved locally offline, will sync later: $liveErr");
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Screening Saved for ${_nameController.text.trim()} (ID: $uniqueId) ✓"),
            backgroundColor: AppConstants.successGreen,
          ),
        );

        // Reset form
        _nameController.clear();
        _ageController.text = "45";
        _phoneController.clear();
        _alternatePhoneController.clear();
        _addressController.clear();
        _glucoseValueController.clear();
        _systolicBpController.clear();
        _diastolicBpController.clear();
        _remarksController.clear();
        _baseHospitalRemarksController.clear();
        setState(() {
          _appliedReferralId = null;
          _appliedReferralPatientName = null;
          _imageFile = null;
          _base64Image = null;
          _referToBaseHospital = false;
        });

        _fetchCampReferrals();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving: $e'), backgroundColor: AppConstants.dangerRed),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
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
            Text("DR Screening Entry", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text("Clinical Stations & Remidio Integration", style: TextStyle(fontSize: 10, color: Colors.white70)),
          ],
        ),
        backgroundColor: AppConstants.primaryOrange,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loadingCamps
          ? const Center(child: CircularProgressIndicator(color: AppConstants.primaryOrange))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Active Camp Bar
                    _buildCampHeaderCard(),
                    const SizedBox(height: 14),

                    // STATION 1: Demographics & Registration
                    _buildStation1Card(),
                    const SizedBox(height: 14),

                    // STATION 2: Diabetes & Vitals
                    _buildStation2Card(),
                    const SizedBox(height: 14),

                    // STATION 3: Eye Assessment & Fundus
                    _buildStation3Card(),
                    const SizedBox(height: 20),

                    // Submit Button
                    ElevatedButton(
                      onPressed: _isSaving ? null : _handleSaveScreening,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppConstants.primaryOrange,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                      child: _isSaving
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle_outline, size: 20),
                                SizedBox(width: 8),
                                Text("COMPLETE & SAVE SCREENING", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              ],
                            ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildCampHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppConstants.primaryOrange.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppConstants.primaryOrangeLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.campaign_outlined, color: AppConstants.primaryOrange, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("ACTIVE DR SCREENING CAMP", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppConstants.primaryOrange)),
                Text(
                  _selectedCamp != null ? "${_selectedCamp!.name} (${_selectedCamp!.shortCode})" : "No Camp Selected",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0F172A)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          TextButton.icon(
            onPressed: _openCampSelectorSheet,
            icon: const Icon(Icons.sync_alt, size: 14, color: AppConstants.primaryOrange),
            label: const Text("Switch", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppConstants.primaryOrange)),
          ),
        ],
      ),
    );
  }

  Widget _buildStation1Card() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  CircleAvatar(radius: 10, backgroundColor: AppConstants.primaryOrange, child: Text("1", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold))),
                  SizedBox(width: 8),
                  Text("Station 1: Patient Demographics", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Pre-Referrals Quick Banner
          if (_appliedReferralId != null) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFD1FAE5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF6EE7B7)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Color(0xFF065F46), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Pre-Referral Auto-Filled: $_appliedReferralPatientName",
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                    ),
                  ),
                  TextButton(
                    onPressed: _unlinkReferral,
                    child: const Text("Unlink", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF991B1B))),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ] else if (_campReferrals.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFDBA74)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.volunteer_activism_outlined, color: AppConstants.primaryOrange, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "${_campReferrals.length} Patient(s) Pre-Referred for this Camp",
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF9A3412)),
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppConstants.primaryOrange,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      minimumSize: const Size(60, 28),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    onPressed: _openReferralsSheet,
                    child: const Text("Select ➔", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Patient Full Name
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: "Patient Full Name *",
              hintText: "Enter full name",
              prefixIcon: const Icon(Icons.person_outline, color: AppConstants.primaryOrange),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            validator: (v) => v == null || v.trim().isEmpty ? "Patient name is required" : null,
          ),
          const SizedBox(height: 12),

          // Age & Gender
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
                  value: _selectedGender,
                  decoration: InputDecoration(
                    labelText: "Gender *",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: ["Male", "Female", "Other"].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                  onChanged: (v) => setState(() => _selectedGender = v ?? "Male"),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Mobile & Alternate Phone
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: "Mobile Phone *",
                    hintText: "10-digit number",
                    prefixIcon: const Icon(Icons.phone_outlined, color: AppConstants.primaryOrange),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? "Required" : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _alternatePhoneController,
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: "Alternate Phone",
                    hintText: "Family / Relative",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Address / Village
          TextFormField(
            controller: _addressController,
            decoration: InputDecoration(
              labelText: "Village / Town / Address *",
              hintText: "e.g. Ripponpete Village, Hosanagara",
              prefixIcon: const Icon(Icons.location_on_outlined, color: AppConstants.primaryOrange),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            validator: (v) => v == null || v.trim().isEmpty ? "Address is required" : null,
          ),
          const SizedBox(height: 12),

          // Referral Source
          DropdownButtonFormField<String>(
            value: _selectedReferralSource,
            decoration: InputDecoration(
              labelText: "Patient Referral / Awareness Source *",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: [
              "ASHA Worker / ANM Outreach",
              "Vision Center / PHC / CHC",
              "Doctor / Hospital Referral",
              "Tandora / Local Announcement",
              "Pamphlet / Poster / Banner",
              "Word of Mouth / Relative",
              "Self / Walk-in",
            ].map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12)))).toList(),
            onChanged: (v) => setState(() => _selectedReferralSource = v ?? "ASHA Worker / ANM Outreach"),
          ),
          const SizedBox(height: 10),

          // Gift of Vision Toggle
          SwitchListTile(
            title: const Text("Referred to Gift of Vision (100% Free Sankara Sponsorship)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            value: _referredToGiftOfVision,
            activeColor: AppConstants.primaryOrange,
            onChanged: (v) => setState(() => _referredToGiftOfVision = v),
            contentPadding: EdgeInsets.zero,
          ),
        ],
      ),
    );
  }

  Widget _buildStation2Card() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              CircleAvatar(radius: 10, backgroundColor: AppConstants.primaryOrange, child: Text("2", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold))),
              SizedBox(width: 8),
              Text("Station 2: Diabetes & Vitals Assessment", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            ],
          ),
          const SizedBox(height: 12),

          // Duration of Diabetes
          DropdownButtonFormField<String>(
            value: _selectedDuration,
            decoration: InputDecoration(
              labelText: "Duration of Diabetes *",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: AppConstants.diabetesDurationOptions.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
            onChanged: (v) => setState(() => _selectedDuration = v ?? "Newly Diagnosed"),
          ),
          const SizedBox(height: 12),

          // Blood Sugar Measure Type & Value
          Row(
            children: [
              Expanded(
                flex: 3,
                child: DropdownButtonFormField<String>(
                  value: _selectedMeasureType,
                  decoration: InputDecoration(
                    labelText: "Sugar Test Type",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: [
                    "GRBS (mg/dL)",
                    "RBS (mg/dL)",
                    "FBS (mg/dL)",
                    "PPBS (mg/dL)",
                    "HbA1c (%)",
                  ].map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 11)))).toList(),
                  onChanged: (v) => setState(() => _selectedMeasureType = v ?? "GRBS (mg/dL)"),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: TextFormField(
                  controller: _glucoseValueController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: "Value",
                    hintText: "e.g. 185",
                    prefixIcon: const Icon(Icons.water_drop_outlined, color: AppConstants.primaryOrange),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Recorded By & PHC Name
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedRecordedBy,
                  decoration: InputDecoration(
                    labelText: "Recorded By",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: [
                    "CHC / PHC Staff",
                    "ASHA Worker",
                    "Camp Screener",
                    "Lab Technician",
                    "Self Reported",
                  ].map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 11)))).toList(),
                  onChanged: (v) => setState(() => _selectedRecordedBy = v ?? "CHC / PHC Staff"),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _chcPhcCenterController,
                  decoration: InputDecoration(
                    labelText: "PHC / Center Name",
                    hintText: "e.g. Ripponpete PHC",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Blood Pressure
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _systolicBpController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: "Systolic BP",
                    hintText: "e.g. 120",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _diastolicBpController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: "Diastolic BP",
                    hintText: "e.g. 80",
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStation3Card() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              CircleAvatar(radius: 10, backgroundColor: AppConstants.primaryOrange, child: Text("3", style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold))),
              SizedBox(width: 8),
              Text("Station 3: Eye Assessment & Fundus", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
            ],
          ),
          const SizedBox(height: 12),

          // Fundus Captured YES / NO Switch
          SwitchListTile(
            title: const Text("Fundus Image Captured (Remidio Camera)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            subtitle: Text(_fundusCaptured ? "Camera photo attached" : "Not captured (Reason recorded)", style: const TextStyle(fontSize: 10, color: AppConstants.textMuted)),
            value: _fundusCaptured,
            activeColor: AppConstants.primaryOrange,
            onChanged: (v) => setState(() => _fundusCaptured = v),
            contentPadding: EdgeInsets.zero,
          ),

          if (!_fundusCaptured) ...[
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _fundusNotCapturedReason,
              decoration: InputDecoration(
                labelText: "Reason Fundus Not Captured *",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              items: [
                "Pupil not dilated",
                "Dense Cataract (Hazy media)",
                "Patient uncooperative",
                "Camera / Remidio at Base Hospital",
                "Technical limitation",
                "Patient refused",
              ].map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 11)))).toList(),
              onChanged: (v) => setState(() => _fundusNotCapturedReason = v ?? "Pupil not dilated"),
            ),
          ] else ...[
            const SizedBox(height: 8),
            // Photo capture buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt, color: AppConstants.primaryOrange, size: 18),
                    label: const Text("Take Photo", style: TextStyle(color: AppConstants.primaryOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library, color: AppConstants.primaryOrange, size: 18),
                    label: const Text("From Gallery", style: TextStyle(color: AppConstants.primaryOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
            if (_imageFile != null) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.file(_imageFile!, height: 140, width: double.infinity, fit: BoxFit.cover),
              ),
            ],
          ],

          const SizedBox(height: 14),

          // Cataract Status
          DropdownButtonFormField<String>(
            value: _selectedCataract,
            decoration: InputDecoration(
              labelText: "Cataract Finding",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: [
              "None",
              "Immature Cataract",
              "Mature Cataract",
              "Hypermature Cataract",
              "Pseudophakic (IOL)",
            ].map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 12)))).toList(),
            onChanged: (v) => setState(() => _selectedCataract = v ?? "None"),
          ),
          const SizedBox(height: 12),

          // DR Severity Status
          DropdownButtonFormField<String>(
            value: _selectedDrStatus,
            decoration: InputDecoration(
              labelText: "Diabetic Retinopathy Diagnosis *",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: AppConstants.drStatusOptions.map((dr) => DropdownMenuItem(value: dr, child: Text(dr, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)))).toList(),
            onChanged: (v) => setState(() => _selectedDrStatus = v ?? "No DR"),
          ),
          const SizedBox(height: 12),

          // Clinical Advice
          DropdownButtonFormField<String>(
            value: _selectedAdvice,
            decoration: InputDecoration(
              labelText: "Clinical Advice / Plan *",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
            items: AppConstants.adviceOptions.map((a) => DropdownMenuItem(value: a, child: Text(a, style: const TextStyle(fontSize: 12)))).toList(),
            onChanged: (v) => setState(() => _selectedAdvice = v ?? "Annual Review"),
          ),
          const SizedBox(height: 12),

          // Refer to Base Hospital (RBH)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _referToBaseHospital ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _referToBaseHospital ? const Color(0xFFFCA5A5) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SwitchListTile(
                  title: const Text("Refer to Base Hospital (RBH)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF991B1B))),
                  subtitle: const Text("Requires tertiary retina evaluation / laser / surgery at Sankara Eye Hospital", style: TextStyle(fontSize: 10, color: AppConstants.textMuted)),
                  value: _referToBaseHospital,
                  activeColor: AppConstants.dangerRed,
                  onChanged: (v) => setState(() => _referToBaseHospital = v),
                  contentPadding: EdgeInsets.zero,
                ),
                if (_referToBaseHospital) ...[
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _baseHospitalRemarksController,
                    decoration: InputDecoration(
                      labelText: "Surgeon / Base Hospital Notes *",
                      hintText: "e.g. Severe PDR with Vitreous Hemorrhage - Urgent PRP laser required",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),

          // General Clinical Remarks
          TextFormField(
            controller: _remarksController,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: "General Clinical Remarks",
              hintText: "General observations, systemic history...",
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}
