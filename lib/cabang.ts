// Daftar kantor cabang untuk dropdown. Tambah atau ubah nama di sini.
// Urutannya otomatis diurutkan A-Z di dropdown.
export const CABANG: string[] = [
  "Pekanbaru Panam",
  "Lima Puluh Kota Tanjung Pati",
  "Agam Lubuk Basung",
  "Pekanbaru Kota",
  "Dharmasraya Gunung Medan",
  "Pasaman Lubuk Sikaping",
  "Padang Pariaman HOS Cokroaminoto",
  "Pesisir Selatan Painan",
  "Solok",
  "Batam Sekupang",
  "Tanah Datar Batusangkar",
  "Siak Raja Kecik",
  "Tanjung Pinang",
  "Solok Selatan Padang Aro",
  "Natuna Ranai",
  "Karimun Tanjung Balai",
  "Bukit Tinggi",
  "Rengat",
  "Kuantan Singingi Taluk Kuantan",
  "Padang",
  "Batam Nagoya",
  "Duri",
  "Dumai",
  "Indragiri Hilir Tembilahan",
  "Pelalawan Pangkalan Kerinci",
  "Rokan Hulu Pasir Pengaraian",
  "Rokan Hilir Bagan Sinembah",
  "Kampar Bangkinang",
  "Pasaman Barat Soekarno Hatta",
  "Kanwil Sumbarriau"
].sort((a, b) => a.localeCompare(b, "id"));

export const isCabang = (v: string) => CABANG.includes(v);