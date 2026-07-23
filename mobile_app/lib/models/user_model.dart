class UserModel {
  final int id;
  final String empId;
  final String name;
  final String email;
  final String mobile;
  final String userType;
  final String? assignedTrack;
  final String? assignedPlace;

  UserModel({
    required this.id,
    required this.empId,
    required this.name,
    required this.email,
    required this.mobile,
    required this.userType,
    this.assignedTrack,
    this.assignedPlace,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      empId: json['empId'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      mobile: json['mobile'] ?? '',
      userType: json['userType'] ?? 'outreach',
      assignedTrack: json['assignedTrack'],
      assignedPlace: json['assignedPlace'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'empId': empId,
      'name': name,
      'email': email,
      'mobile': mobile,
      'userType': userType,
      'assignedTrack': assignedTrack,
      'assignedPlace': assignedPlace,
    };
  }
}
