class ScreeningPlaceModel {
  final int id;
  final String name;
  final String shortCode;
  final String district;
  final String state;
  final String? taluk;
  final String? pincode;
  final String? sankaraUnit;
  final String status;
  final String? latitude;
  final String? longitude;
  final String? campDate;
  final String? mapLink;

  ScreeningPlaceModel({
    required this.id,
    required this.name,
    required this.shortCode,
    required this.district,
    required this.state,
    this.taluk,
    this.pincode,
    this.sankaraUnit,
    required this.status,
    this.latitude,
    this.longitude,
    this.campDate,
    this.mapLink,
  });

  factory ScreeningPlaceModel.fromJson(Map<String, dynamic> json) {
    return ScreeningPlaceModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] ?? '',
      shortCode: json['shortCode'] ?? '',
      district: json['district'] ?? '',
      state: json['state'] ?? '',
      taluk: json['taluk'],
      pincode: json['pincode'],
      sankaraUnit: json['sankaraUnit'],
      status: json['status'] ?? 'active',
      latitude: json['latitude'],
      longitude: json['longitude'],
      campDate: json['campDate'] ?? json['camp_date'],
      mapLink: json['mapLink'] ?? json['map_link'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'shortCode': shortCode,
      'district': district,
      'state': state,
      'taluk': taluk,
      'pincode': pincode,
      'sankaraUnit': sankaraUnit,
      'status': status,
      'latitude': latitude,
      'longitude': longitude,
      'campDate': campDate,
      'mapLink': mapLink,
    };
  }
}
