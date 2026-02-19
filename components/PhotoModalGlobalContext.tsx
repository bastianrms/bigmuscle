// components/PhotoModalGlobalContext.tsx
import * as React from "react";
import { DataProvider, GlobalActionsProvider } from "@plasmicapp/host";
import { useRouter } from "next/router";

export type PhotoModalData = {
  isOpen: boolean;
  photoId: string | null;
  previewUrl: string | null;
};

type PhotoModalActions = {
  openPhoto: (photoId: string, previewUrl?: string | null) => void;
  closePhoto: () => void;
  setPhotoId: (photoId: string | null) => void;
  setPreviewUrl: (previewUrl: string | null) => void;
};

export function PhotoModalGlobalContext({
  children,
}: React.PropsWithChildren) {
  const router = useRouter();

  const [state, setState] = React.useState<PhotoModalData>({
    isOpen: false,
    photoId: null,
    previewUrl: null,
  });

  const close = React.useCallback(() => {
    setState({ isOpen: false, photoId: null, previewUrl: null });
  }, []);

  React.useEffect(() => {
    const onRouteChangeStart = () => close();
    router.events.on("routeChangeStart", onRouteChangeStart);

    return () => {
      router.events.off("routeChangeStart", onRouteChangeStart);
    };
  }, [router.events, close]);

  const actions = React.useMemo<PhotoModalActions>(
    () => ({
      openPhoto: (photoId: string, previewUrl?: string | null) => {
        setState({
          isOpen: true,
          photoId,
          previewUrl: previewUrl ?? null,
        });
      },
      closePhoto: () => close(),
      setPhotoId: (photoId: string | null) => {
        setState((prev) => ({ ...prev, photoId }));
      },
      setPreviewUrl: (previewUrl: string | null) => {
        setState((prev) => ({ ...prev, previewUrl }));
      },
    }),
    [close]
  );

  return (
    <GlobalActionsProvider contextName="PhotoModalGlobalContext" actions={actions}>
      <DataProvider name="photoModal" data={state}>
        {children}
      </DataProvider>
    </GlobalActionsProvider>
  );
}

export default PhotoModalGlobalContext;