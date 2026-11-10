import { GroupShell } from "@/modules/shg/views/group-shell";

/** Group summary and its section tabs share one frame; the group comes from the URL. */
export default async function GroupLayout({ children, params }: LayoutProps<"/shg/groups/[groupId]">) {
  const { groupId } = await params;
  return <GroupShell groupId={decodeURIComponent(groupId)}>{children}</GroupShell>;
}
