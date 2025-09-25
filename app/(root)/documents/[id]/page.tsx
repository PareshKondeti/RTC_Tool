import CollaborativeRoom from "@/components/CollaborativeRoom"
import { getDocument } from "@/lib/actions/room.actions";
import { getClerkUsers } from "@/lib/actions/user.actions";
import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation";

const Document = async ({ params: { id } }: SearchParamProps) => {
  const { userId } = auth();
  if(!userId) redirect('/sign-in');

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail = clerkUser.primaryEmailAddressId
    ? clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
    : clerkUser.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) redirect('/sign-in');

  const room = await getDocument({
    roomId: id,
    userId: primaryEmail,
  });

  if(!room) redirect('/');

  const userIds = Object.keys(room.usersAccesses);
  const users = await getClerkUsers({ userIds });

  const usersData = users
    .filter((user): user is User => Boolean(user && (user as User).email))
    .map((user: User) => ({
      ...user,
      userType: room.usersAccesses[user.email!]?.includes('room:write')
        ? 'editor'
        : 'viewer'
    }))

  const currentUserType = room.usersAccesses[primaryEmail]?.includes('room:write') ? 'editor' : 'viewer';

  return (
    <main className="flex w-full flex-col items-center">
      <CollaborativeRoom 
        roomId={id}
        roomMetadata={room.metadata}
        users={usersData}
        currentUserType={currentUserType}
      />
    </main>
  )
}

export default Document