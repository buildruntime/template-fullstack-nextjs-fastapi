import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listUsers, requireAdmin } from "@/lib/dal";
import { formatDate, formatDateTime } from "@/lib/format";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireAdmin();
  const { cursor, search } = await searchParams;
  const query = typeof search === "string" ? search.trim().slice(0, 100) : "";
  const page = await listUsers({
    cursor: typeof cursor === "string" ? cursor : undefined,
    search: query,
  });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Change roles and deactivate accounts. Deactivating someone signs them out everywhere."
      />

      <form role="search" className="mb-5 flex max-w-md gap-2">
        <label htmlFor="search" className="sr-only">
          Search by name or email
        </label>
        <Input
          id="search"
          name="search"
          type="search"
          placeholder="Search by name or email"
          defaultValue={query}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
              <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {query ? `No users match "${query}".` : "No users yet."}
                </TableCell>
              </TableRow>
            )}
            {page.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">
                    {user.name}
                    {user.id === admin.id && (
                      <span className="font-normal text-muted-foreground"> (you)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_active ? (
                    <span className="text-sm">Active</span>
                  ) : (
                    <Badge variant="outline">Deactivated</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {formatDateTime(user.last_login_at)}
                </TableCell>
                <TableCell>
                  <UserActions user={user} isSelf={user.id === admin.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <nav aria-label="Pagination" className="mt-4 flex justify-end gap-2">
        {typeof cursor === "string" && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={query ? `/admin/users?search=${encodeURIComponent(query)}` : "/admin/users"}
            >
              First page
            </Link>
          </Button>
        )}
        {page.next_cursor && (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/users?${new URLSearchParams({ cursor: page.next_cursor, ...(query && { search: query }) })}`}
            >
              Next page
            </Link>
          </Button>
        )}
      </nav>
    </>
  );
}
