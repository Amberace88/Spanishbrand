import { requireStaff } from "@/lib/auth/rbac";
import { PageTitle } from "@/components/admin/ui";
import { MediaImporter } from "@/components/admin/MediaImporter";
import { listSiteImages } from "@/lib/site-images";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requireStaff(["ADMIN"]);
  const images = await listSiteImages();
  return (
    <>
      <PageTitle title="Imágenes del sitio" sub="Fotos de campaña para la portada y las secciones (se guardan en site/<nombre>.webp)" />
      <MediaImporter initial={Object.entries(images).map(([name, url]) => ({ name, url }))} />
    </>
  );
}
