# Absen App API

API untuk sistem manajemen absensi sekolah menggunakan Express.js dan Firebase Realtime Database.

## Fitur

- **User Management**: Registrasi, login, dan manajemen user (siswa & guru)
- **Class Management**: CRUD kelas dengan jurusan
- **Attendance System**: Sistem absensi dengan QR code
- **QR Code Management**: Generate dan verifikasi QR code untuk absensi
- **Role-based Access**: Kontrol akses berdasarkan role (siswa/guru)
- **JWT Authentication**: Sistem autentikasi dengan JSON Web Token

## Teknologi

- Node.js + Express.js
- Firebase Admin SDK (Realtime Database)
- JWT untuk autentikasi
- bcrypt untuk hashing password
- CORS, Helmet, Rate Limiting untuk keamanan

## Instalasi

1. Clone repository
```bash
git clone <repository-url>
cd absen-app-api
```

2. Install dependencies
```bash
npm install
```

3. Setup Firebase
   - Buat project Firebase
   - Enable Realtime Database
   - Download service account key
   - Simpan sebagai `utils/serviceAccountKey.json`

4. Setup environment variables
```bash
cp .env.example .env
# Edit .env dengan konfigurasi Anda
```

5. Jalankan aplikasi
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/v1/user/register
```

**Body (Siswa):**
```json
{
  "nama": "John Doe",
  "telephone": "08123456789",
  "email": "john@example.com",
  "password": "password123",
  "jenis_kelamin": "laki-laki",
  "role": "siswa",
  "alamat": {
    "provinsi": "Jawa Timur",
    "kota": "Surabaya",
    "kecamatan": "Sukolilo",
    "kode_pos": "60111",
    "desa": "Keputih",
    "rt": "01",
    "rw": "02"
  },
  "nama_ibu": "Jane Doe",
  "nama_ayah": "Bob Doe",
  "telephone_ortu": "08123456788",
  "nisn": "1234567890",
  "kelas": "XII",
  "jurusan": "IPA"
}
```

**Body (Guru):**
```json
{
  "nama": "Prof. Smith",
  "telephone": "08123456789",
  "email": "smith@example.com",
  "password": "password123",
  "jenis_kelamin": "laki-laki",
  "role": "guru",
  "alamat": {
    "provinsi": "Jawa Timur",
    "kota": "Surabaya",
    "kecamatan": "Sukolilo",
    "kode_pos": "60111",
    "desa": "Keputih",
    "rt": "01",
    "rw": "02"
  }
}
```

#### Login
```http
POST /api/v1/user/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### User Management

#### Get All Users (Guru only)
```http
GET /api/v1/user
Authorization: Bearer <token>
```

#### Get User by ID
```http
GET /api/v1/user/:id
Authorization: Bearer <token>
```

#### Update User
```http
PUT /api/v1/user/:id
Authorization: Bearer <token>
```

#### Delete User (Guru only)
```http
DELETE /api/v1/user/:id
Authorization: Bearer <token>
```

#### Get Students by Class
```http
GET /api/v1/user/siswa/kelas/:kelas/:jurusan
Authorization: Bearer <token>
```

### Class Management

#### Create Class (Guru only)
```http
POST /api/v1/kelas
Authorization: Bearer <token>
```

**Body:**
```json
{
  "kelas": "XII",
  "jurusan": "IPA"
}
```

#### Get All Classes
```http
GET /api/v1/kelas
Authorization: Bearer <token>
```

#### Get Class by ID
```http
GET /api/v1/kelas/:id
Authorization: Bearer <token>
```

#### Update Class (Guru only)
```http
PUT /api/v1/kelas/:id
Authorization: Bearer <token>
```

#### Delete Class (Guru only)
```http
DELETE /api/v1/kelas/:id
Authorization: Bearer <token>
```

### Attendance Management

#### Create Attendance Record (Siswa only)
```http
POST /api/v1/absen
Authorization: Bearer <token>
```

**Body:**
```json
{
  "qrCode": "abc123xyz789"
}
```

#### Get Class Attendance (Guru only)
```http
GET /api/v1/absen/kelas/:kelasId?tanggal=1&bulan=12&tahun=2023
Authorization: Bearer <token>
```

#### Get Student's Own Attendance
```http
GET /api/v1/absen/siswa/me
Authorization: Bearer <token>
```

#### Get Student Attendance by ID (Guru only)
```http
GET /api/v1/absen/siswa/:siswaId
Authorization: Bearer <token>
```

#### Update Attendance Record (Guru only)
```http
PUT /api/v1/absen/:kelasId/:siswaId/:recordId
Authorization: Bearer <token>
```

**Body:**
```json
{
  "keterangan": "sakit"
}
```

#### Delete Attendance Record (Guru only)
```http
DELETE /api/v1/absen/:kelasId/:siswaId/:recordId
Authorization: Bearer <token>
```

#### Get Attendance Summary (Guru only)
```http
GET /api/v1/absen/summary/:kelasId?bulan=12&tahun=2023
Authorization: Bearer <token>
```

### QR Code Management

#### Generate QR Code (Guru only)
```http
POST /api/v1/qr/generate
Authorization: Bearer <token>
```

#### Get Current QR Code (Guru only)
```http
GET /api/v1/qr/current
Authorization: Bearer <token>
```

#### Verify QR Code (Siswa only)
```http
POST /api/v1/qr/verify
Authorization: Bearer <token>
```

**Body:**
```json
{
  "code": "abc123xyz789"
}
```

#### Regenerate QR Code (Guru only)
```http
PUT /api/v1/qr/regenerate
Authorization: Bearer <token>
```

#### Delete QR Code (Guru only)
```http
DELETE /api/v1/qr/current
Authorization: Bearer <token>
```

## Database Structure

```json
{
  "absen-app": {
    "user": {
      "<user-id>": {
        "id": "user-id",
        "nama": "Nama User",
        "telephone": "08123456789",
        "email": "user@example.com",
        "password": "hashed-password",
        "jenis_kelamin": "laki-laki|perempuan",
        "role": "siswa|guru",
        "alamat": { ... },
        "detail": { ... } // hanya untuk siswa
      }
    },
    "kelas": {
      "<kelas-id>": {
        "id": "kelas-id",
        "kelas": "XII",
        "jurusan": "IPA"
      }
    },
    "absen": {
      "<kelas-id>": {
        "<siswa-id>": {
          "<record-id>": {
            "id": "record-id",
            "jam": 8,
            "menit": 30,
            "tanggal": 15,
            "bulan": 12,
            "tahun": 2023,
            "keterangan": "hadir",
            "kelas": "XII",
            "jurusan": "IPA"
          }
        }
      }
    },
    "qr-unique-code": {
      "id": "qr-id",
      "code": "random-20-char-string",
      "createdAt": "2023-12-15T08:30:00.000Z",
      "createdBy": "guru-id"
    }
  }
}
```

## Error Handling

API menggunakan HTTP status codes standar:

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Security Features

- JWT Authentication
- Password hashing dengan bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Role-based access control

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
npm run lint:fix
```

## Environment Variables

Lihat file `.env.example` untuk konfigurasi yang diperlukan.

## License

MIT