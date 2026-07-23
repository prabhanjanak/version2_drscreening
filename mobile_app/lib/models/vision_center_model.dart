class VisionCenterModel {
  final int id;
  final String name;
  final String shortCode;
  final String sankaraUnit;
  final String state;
  final String district;
  final String? taluk;
  final String? pincode;
  final String? address;
  final String? phone;
  final String? mapsUrl;
  final String? latitude;
  final String? longitude;
  final String status;

  VisionCenterModel({
    required this.id,
    required this.name,
    required this.shortCode,
    required this.sankaraUnit,
    required this.state,
    required this.district,
    this.taluk,
    this.pincode,
    this.address,
    this.phone,
    this.mapsUrl,
    this.latitude,
    this.longitude,
    required this.status,
  });

  factory VisionCenterModel.fromJson(Map<String, dynamic> json) {
    return VisionCenterModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] ?? '',
      shortCode: json['shortCode'] ?? '',
      sankaraUnit: json['sankaraUnit'] ?? '',
      state: json['state'] ?? '',
      district: json['district'] ?? '',
      taluk: json['taluk'],
      pincode: json['pincode'],
      address: json['address'],
      phone: json['phone'],
      mapsUrl: json['mapsUrl'],
      latitude: json['latitude'],
      longitude: json['longitude'],
      status: json['status'] ?? 'active',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'shortCode': shortCode,
      'sankaraUnit': sankaraUnit,
      'state': state,
      'district': district,
      'taluk': taluk,
      'pincode': pincode,
      'address': address,
      'phone': phone,
      'mapsUrl': mapsUrl,
      'latitude': latitude,
      'longitude': longitude,
      'status': status,
    };
  }
}
