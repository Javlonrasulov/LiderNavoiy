import { useNavigate } from 'react-router';
import ClientMap from '../../components/ClientMap';
import { useTheme } from '../../components/ThemeContext';

// Today's clients with Navoiy coordinates
const TODAY_CLIENTS = [
  {
    id: 1,
    name: 'XOLMURODOVA SABRINA MIRO',
    address: 'Magistral pizza aeroportda tras...',
    amount: '862.96',
    visitTime: '09:15',
    lat: 40.0921,
    lng: 65.3612,
    debt: '862.96',
    lastVisit: '01.03.2026',
    day: 'monday',
  },
  {
    id: 2,
    name: "YANGI ASR 777' OK",
    address: 'Magistral pizza aeroportda tras...',
    amount: '343.12',
    visitTime: '10:00',
    lat: 40.0876,
    lng: 65.3745,
    debt: '343.12',
    lastVisit: '28.02.2026',
    day: 'monday',
  },
  {
    id: 3,
    name: 'AZIZOVA VAZIRA MEHRIDDINOVA',
    address: '01 - Тошшироб',
    amount: '471489.12',
    visitTime: '10:45',
    lat: 40.0844,
    lng: 65.3792,
    debt: '471489.12',
    lastVisit: '25.02.2026',
    day: 'monday',
  },
  {
    id: 4,
    name: 'GO ZAL TONG NURAPSONI',
    address: '01 - Тошшироб',
    amount: '0.00',
    visitTime: '11:30',
    lat: 40.0802,
    lng: 65.3854,
    debt: '0.00',
    lastVisit: '01.03.2026',
    day: 'monday',
  },
  {
    id: 5,
    name: 'SHAROPOV SHAROF YATT',
    address: 'АҲИМОВ ШАХЗОД ҒНИЗА',
    amount: '720.89',
    visitTime: '12:15',
    lat: 40.0761,
    lng: 65.3921,
    debt: '720.89',
    lastVisit: '27.02.2026',
    day: 'monday',
  },
  {
    id: 6,
    name: 'Муҳаммадиев Норир',
    address: 'Меҳр маркази',
    amount: '191748.74',
    visitTime: '13:00',
    lat: 40.0715,
    lng: 65.3980,
    debt: '0.00',
    lastVisit: '01.03.2026',
    day: 'tuesday',
  },
  {
    id: 7,
    name: 'QIZILTEPA ULGURLJ CHAKANA',
    address: 'Оператир центр',
    amount: '0.00',
    visitTime: '14:00',
    lat: 40.0688,
    lng: 65.4045,
    debt: '0.00',
    lastVisit: '28.02.2026',
    day: 'tuesday',
  },
  {
    id: 8,
    name: 'ABUXAMIDOVA SHAXZODABONU',
    address: 'ЭЛЕКТРОХИМИЯ УГЛИ',
    amount: '799997.90',
    visitTime: '15:00',
    lat: 40.0650,
    lng: 65.4110,
    debt: '799997.90',
    lastVisit: '26.02.2026',
    day: 'wednesday',
  },
];

export default function LocatsiyaPage() {
  const navigate = useNavigate();
  const { language, setLanguage } = useTheme();

  return (
    <ClientMap
      onClose={() => navigate('/')}
      clients={TODAY_CLIENTS}
      language={language}
      onLanguageChange={(lang) => setLanguage(lang as 'uz_latn' | 'uz_cyrl' | 'ru')}
    />
  );
}
