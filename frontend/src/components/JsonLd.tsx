type JsonLdProps = {
  data?: Record<string, unknown> | null;
};

const JsonLd = ({ data }: JsonLdProps) => {
  if (!data) return null;
  return (
    <script type="application/ld+json">
      {JSON.stringify(data)}
    </script>
  );
};

export default JsonLd;
