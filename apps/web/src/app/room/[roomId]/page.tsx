import { StudioCanvas } from '@/components/studio/StudioCanvas';

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  return <StudioCanvas initialRoomId={params.roomId} />;
}
