with open("backend/app/routers.py", "r", encoding="utf-8") as f:
    content = f.read()
new_code = """

class ParseUrlRequest(BaseModel):
    url: str = Field(..., description="要解析的网页URL")


class ParseUrlResponse(BaseModel):
    success: bool
    title: str = ""
    content: str = ""
    summary: str = ""
    error: str = ""


@router.post("/parse-url", response_model=ParseUrlResponse)
def parse_url(req: ParseUrlRequest) -> ParseUrlResponse:
    try:
        from .crawler import _session, fetch_article
        
        session = _session()
        result = fetch_article(session, req.url, "url_parser", "")
        
        if result:
            return ParseUrlResponse(
                success=True,
                title=result.title,
                content=result.content,
                summary=result.summary,
            )
        else:
            return ParseUrlResponse(
                success=False,
                error="无法解析该网页内容",
            )
    except Exception as e:
        logger.error("URL parse failed: %s", e)
        return ParseUrlResponse(
            success=False,
            error=str(e),
        )

"""

content = content.replace("@router.get(\"/stats\")", new_code + "@router.get(\"/stats\")")
with open("backend/app/routers.py", "w", encoding="utf-8") as f:
    f.write(content)
