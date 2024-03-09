import { useEffect } from "react";

const useActor = (service: any) => {
  return [null, (action: { type: string; payload?: any }) => {}] as const;
};

type Props = {
  authService: any;
  notificationsService: any;
};

const TestComponent: React.FC<Props> = ({
  authService,
  notificationsService,
}) => {
  const [, sendNotifications] = useActor(notificationsService);

  useEffect(() => {
    sendNotifications({ type: "FETCH" });
  }, [sendNotifications]);

  return (
    <div>
      <h1>TestComponent</h1>
      {authService}
    </div>
  );
};

export default TestComponent;
