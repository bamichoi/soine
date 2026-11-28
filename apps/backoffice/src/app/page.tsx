import { redirect } from 'next/navigation';

// 인증 구현 후: 세션의 소속 서비스에 따라 /choidolsang, /goodplace 또는 서비스 선택 화면으로 보낸다.
export default function RootPage() {
  redirect('/login');
}
