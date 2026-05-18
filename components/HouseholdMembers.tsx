import { SectionPanel } from "@/components/SectionPanel";
import { getSeedData } from "@/lib/storage";

export function HouseholdMembers() {
  const { members } = getSeedData();

  return (
    <SectionPanel title="Household members" tag={`${members.length} members`}>
      <ul className="member-list">
        {members.map((member) => (
          <li className="list-row" key={member.id}>
            <strong>{member.name}</strong>
            <span>{member.role}</span>
          </li>
        ))}
      </ul>
    </SectionPanel>
  );
}
