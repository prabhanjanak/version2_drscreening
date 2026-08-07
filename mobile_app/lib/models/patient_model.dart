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
  final String diabetesDuration;
  final String? bloodPressure;
  final String drStatus;
  final String advice;
  final String imagePath; // Local base64 or remote URL
  final String imageQuality;
  final String referralStatus;
  final bool referToBaseHospital;
  final String? baseHospitalRemarks;
  final String? remarks;
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
    required this.diabetesDuration,
    this.bloodPressure,
    required this.drStatus,
    required this.advice,
    required this.imagePath,
    this.imageQuality = "Good",
    this.referralStatus = "Referred",
    this.referToBaseHospital = false,
    this.baseHospitalRemarks,
    this.remarks,
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
      diabetesDuration: json['diabetesDuration'] ?? 'No Diabetes',
      bloodPressure: json['bloodPressure'],
      drStatus: json['drStatus'] ?? 'No DR',
      advice: json['advice'] ?? 'Annual Review',
      imagePath: json['imagePath'] ?? '',
      imageQuality: json['imageQuality'] ?? 'Good',
      referralStatus: json['referralStatus'] ?? 'Referred',
      referToBaseHospital: json['referToBaseHospital'] == true || json['referToBaseHospital'] == 1,
      baseHospitalRemarks: json['baseHospitalRemarks'],
      remarks: json['remarks'],
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
      'diabetesDuration': diabetesDuration,
      'bloodPressure': bloodPressure,
      'drStatus': drStatus,
      'advice': advice,
      'imagePath': imagePath,
      'imageQuality': imageQuality,
      'referralStatus': referralStatus,
      'referToBaseHospital': referToBaseHospital,
      'baseHospitalRemarks': baseHospitalRemarks,
      'remarks': remarks,
      'isSynced': isSynced ? 1 : 0,
    };
  }
}
