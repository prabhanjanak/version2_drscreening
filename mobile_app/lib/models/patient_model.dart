class PatientModel {
  final int? id;
  final String uniqueId;
  final String date;
  final String screeningPlaceCode;
  final int serialNumber;
  final String name;
  final int age;
  final String gender;
  final String? address;
  final String phone;
  final String? alternatePhone;
  final String referralSource;
  final String diabetesDuration;
  final String diabetesMeasureType;
  final String? diabetesMeasureValue;
  final String? grbsRecordedBy;
  final String? chcPhcCenterName;
  final String? bloodPressure;
  final String drStatus;
  final String hasCataract;
  final String? cataractPlanning;
  final bool fundusCaptured;
  final String? fundusNotCapturedReason;
  final String advice;
  final String imagePath; // Local base64 or remote URL
  final String imageQuality;
  final String referralStatus;
  final bool referToBaseHospital;
  final String? baseHospitalRemarks;
  final String? remarks;
  final bool referredToGiftOfVision;
  final String? giftOfVisionNotes;
  final String? govtSchemes;
  final bool visitedBaseHospital;
  final String? baseHospitalVisitDate;
  final String? baseHospitalOutcome;
  final String? baseHospitalOutcomeNotes;
  final bool isSynced;

  PatientModel({
    this.id,
    required this.uniqueId,
    required this.date,
    required this.screeningPlaceCode,
    required this.serialNumber,
    required this.name,
    required this.age,
    required this.gender,
    this.address,
    required this.phone,
    this.alternatePhone,
    this.referralSource = "ASHA Worker / ANM Outreach",
    required this.diabetesDuration,
    this.diabetesMeasureType = "GRBS (mg/dL)",
    this.diabetesMeasureValue,
    this.grbsRecordedBy = "CHC / PHC Staff",
    this.chcPhcCenterName,
    this.bloodPressure,
    required this.drStatus,
    this.hasCataract = "None",
    this.cataractPlanning,
    this.fundusCaptured = true,
    this.fundusNotCapturedReason,
    required this.advice,
    required this.imagePath,
    this.imageQuality = "Good",
    this.referralStatus = "Referred",
    this.referToBaseHospital = false,
    this.baseHospitalRemarks,
    this.remarks,
    this.referredToGiftOfVision = false,
    this.giftOfVisionNotes,
    this.govtSchemes,
    this.visitedBaseHospital = false,
    this.baseHospitalVisitDate,
    this.baseHospitalOutcome,
    this.baseHospitalOutcomeNotes,
    this.isSynced = true,
  });

  factory PatientModel.fromJson(Map<String, dynamic> json) {
    return PatientModel(
      id: json['id'] != null ? int.parse(json['id'].toString()) : null,
      uniqueId: json['uniqueId'] ?? '',
      date: json['date'] ?? '',
      screeningPlaceCode: json['screeningPlaceCode'] ?? '',
      serialNumber: json['serialNumber'] != null ? int.parse(json['serialNumber'].toString()) : 1,
      name: json['name'] ?? '',
      age: json['age'] != null ? int.parse(json['age'].toString()) : 0,
      gender: json['gender'] ?? 'Male',
      address: json['address'],
      phone: json['phone'] ?? '',
      alternatePhone: json['alternatePhone'],
      referralSource: json['referralSource'] ?? 'ASHA Worker / ANM Outreach',
      diabetesDuration: json['diabetesDuration'] ?? 'No Diabetes',
      diabetesMeasureType: json['diabetesMeasureType'] ?? 'GRBS (mg/dL)',
      diabetesMeasureValue: json['diabetesMeasureValue'],
      grbsRecordedBy: json['grbsRecordedBy'],
      chcPhcCenterName: json['chcPhcCenterName'],
      bloodPressure: json['bloodPressure'],
      drStatus: json['drStatus'] ?? 'No DR',
      hasCataract: json['hasCataract'] ?? 'None',
      cataractPlanning: json['cataractPlanning'],
      fundusCaptured: json['fundusCaptured'] != false,
      fundusNotCapturedReason: json['fundusNotCapturedReason'],
      advice: json['advice'] ?? 'Annual Review',
      imagePath: json['imagePath'] ?? '',
      imageQuality: json['imageQuality'] ?? 'Good',
      referralStatus: json['referralStatus'] ?? 'Referred',
      referToBaseHospital: json['referToBaseHospital'] == true || json['referToBaseHospital'] == 1,
      baseHospitalRemarks: json['baseHospitalRemarks'],
      remarks: json['remarks'],
      referredToGiftOfVision: json['referredToGiftOfVision'] == true || json['referredToGiftOfVision'] == 1,
      giftOfVisionNotes: json['giftOfVisionNotes'],
      govtSchemes: json['govtSchemes'],
      visitedBaseHospital: json['visitedBaseHospital'] == true || json['visitedBaseHospital'] == 1,
      baseHospitalVisitDate: json['baseHospitalVisitDate'],
      baseHospitalOutcome: json['baseHospitalOutcome'],
      baseHospitalOutcomeNotes: json['baseHospitalOutcomeNotes'],
      isSynced: json['isSynced'] == 1 || json['isSynced'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'uniqueId': uniqueId,
      'date': date,
      'screeningPlaceCode': screeningPlaceCode,
      'serialNumber': serialNumber,
      'name': name,
      'age': age,
      'gender': gender,
      'address': address,
      'phone': phone,
      if (alternatePhone != null) 'alternatePhone': alternatePhone,
      'referralSource': referralSource,
      'diabetesDuration': diabetesDuration,
      'diabetesMeasureType': diabetesMeasureType,
      if (diabetesMeasureValue != null) 'diabetesMeasureValue': diabetesMeasureValue,
      if (grbsRecordedBy != null) 'grbsRecordedBy': grbsRecordedBy,
      if (chcPhcCenterName != null) 'chcPhcCenterName': chcPhcCenterName,
      'bloodPressure': bloodPressure,
      'drStatus': drStatus,
      'hasCataract': hasCataract,
      if (cataractPlanning != null) 'cataractPlanning': cataractPlanning,
      'fundusCaptured': fundusCaptured,
      if (fundusNotCapturedReason != null) 'fundusNotCapturedReason': fundusNotCapturedReason,
      'advice': advice,
      'imagePath': imagePath,
      'imageQuality': imageQuality,
      'referralStatus': referralStatus,
      'referToBaseHospital': referToBaseHospital,
      'baseHospitalRemarks': baseHospitalRemarks,
      'remarks': remarks,
      'referredToGiftOfVision': referredToGiftOfVision,
      if (giftOfVisionNotes != null) 'giftOfVisionNotes': giftOfVisionNotes,
      if (govtSchemes != null) 'govtSchemes': govtSchemes,
      'visitedBaseHospital': visitedBaseHospital,
      if (baseHospitalVisitDate != null) 'baseHospitalVisitDate': baseHospitalVisitDate,
      if (baseHospitalOutcome != null) 'baseHospitalOutcome': baseHospitalOutcome,
      if (baseHospitalOutcomeNotes != null) 'baseHospitalOutcomeNotes': baseHospitalOutcomeNotes,
      'isSynced': isSynced ? 1 : 0,
    };
  }
}
