import Article from "../../../components/article";

export default async function ResourcesLayout(
  props: {
    params: Promise<{ id: string, offerId: string }>,
    children: React.ReactNode
  }
) {

  const {
    // will be a page or nested layout
    children
  } = props;

  return (
    <Article>
      {children}
    </Article>
  )
}
