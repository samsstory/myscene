-- Enable realtime for shows and show_artists tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.show_artists;