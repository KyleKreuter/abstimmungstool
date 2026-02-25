import { useParams } from "react-router-dom";

export default function PollResultsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Ergebnisse (Abstimmung {id})</h1>
    </div>
  );
}
